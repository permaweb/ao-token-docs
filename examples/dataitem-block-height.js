/**
 * Resolve bundled AO DataItem IDs to Arweave block heights.
 *
 * Efficient path:
 * 1. HEAD {HB_NODE}/~arweave@2.9/raw=<DATAITEM_ID>
 *    - read the `offset` header
 * 2. Query an Arweave node's /block_index/<from>/<to> endpoint
 *    - find the first block whose `weave_size` is greater than the offset
 *
 * Usage:
 *   node examples/dataitem-block-height.js <DATAITEM_ID> [DATAITEM_ID...]
 *
 * Environment:
 *   HB_NODE=https://arweave.net
 *   ARWEAVE_NODES=http://tip-1.arweave.xyz:1984,http://tip-2.arweave.xyz:1984,http://tip-3.arweave.xyz:1984
 *   BLOCK_INDEX_PAGE_SIZE=10000
 *   REQUEST_TIMEOUT_MS=15000
 */

const DATAITEM_IDS = process.argv.slice(2);

const HB_NODE = stripTrailingSlash(process.env.HB_NODE || 'https://arweave.net');
const ARWEAVE_NODES = (process.env.ARWEAVE_NODES ||
    'http://tip-1.arweave.xyz:1984,http://tip-2.arweave.xyz:1984,http://tip-3.arweave.xyz:1984')
    .split(',')
    .map((node) => stripTrailingSlash(node.trim()))
    .filter(Boolean);

const BLOCK_INDEX_PAGE_SIZE = Math.min(
    parsePositiveInteger(process.env.BLOCK_INDEX_PAGE_SIZE || '10000', 'BLOCK_INDEX_PAGE_SIZE'),
    10000
);
const REQUEST_TIMEOUT_MS = parsePositiveInteger(
    process.env.REQUEST_TIMEOUT_MS || '15000',
    'REQUEST_TIMEOUT_MS'
);

if (DATAITEM_IDS.length === 0 || DATAITEM_IDS.includes('--help')) {
    console.error('Usage: node examples/dataitem-block-height.js <DATAITEM_ID> [DATAITEM_ID...]');
    process.exit(DATAITEM_IDS.length === 0 ? 1 : 0);
}

async function main() {
    const results = [];

    for (const id of DATAITEM_IDS) {
        const raw = await getDataItemRawOffset(id);
        const block = await resolveBlockHeight(raw.offset);

        results.push({
            id,
            hyperbeamNode: HB_NODE,
            arweaveNode: block.arweaveNode,
            offset: raw.offset.toString(),
            dataOffset: raw.dataOffset,
            headerLength: raw.headerLength,
            contentLength: raw.contentLength,
            blockHeight: block.height,
            blockIndepHash: block.hash,
            txRoot: block.txRoot,
            blockStartOffset: block.blockStartOffset.toString(),
            blockEndOffset: block.blockEndOffset.toString()
        });
    }

    console.log(JSON.stringify(DATAITEM_IDS.length === 1 ? results[0] : results, null, 2));
}

async function getDataItemRawOffset(id) {
    const url = `${HB_NODE}/~arweave@2.9/raw=${id}`;
    const response = await fetchWithTimeout(url, { method: 'HEAD' });

    if (response.status === 404) {
        throw new Error(`DataItem offset is not indexed yet: ${id}`);
    }
    if (!response.ok) {
        throw new Error(`Raw DataItem lookup failed for ${id}: HTTP ${response.status}`);
    }

    const offset = response.headers.get('offset');
    if (!offset) {
        throw new Error(`Raw DataItem lookup returned no offset header for ${id}`);
    }

    return {
        // Use `offset` for block lookup. `data-offset` points to the DataItem payload start.
        offset: BigInt(offset),
        dataOffset: response.headers.get('data-offset'),
        headerLength: response.headers.get('header-length'),
        contentLength: response.headers.get('content-length')
    };
}

async function resolveBlockHeight(offset) {
    const errors = [];

    for (const arweaveNode of ARWEAVE_NODES) {
        try {
            const blockIndex = new BlockIndexClient(arweaveNode);
            return {
                arweaveNode,
                ...(await blockIndex.heightForOffset(offset))
            };
        }
        catch (error) {
            errors.push(`${arweaveNode}: ${error.message}`);
        }
    }

    throw new Error(`All Arweave nodes failed:\n${errors.join('\n')}`);
}

class BlockIndexClient {
    constructor(arweaveNode) {
        this.arweaveNode = arweaveNode;
        this.entries = new Map();
        this.loadedPages = new Set();
        this.tipHeight = null;
    }

    async heightForOffset(offset) {
        let low = 0;
        let high = await this.currentHeight();

        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            const weaveSize = await this.weaveSizeAt(middle);

            if (weaveSize > offset) {
                high = middle;
            }
            else {
                low = middle + 1;
            }
        }

        const entry = await this.blockIndexEntry(low);
        const previousWeaveSize = low === 0 ? 0n : await this.weaveSizeAt(low - 1);

        return {
            height: low,
            hash: entry.hash,
            txRoot: entry.tx_root,
            blockStartOffset: previousWeaveSize,
            blockEndOffset: BigInt(entry.weave_size)
        };
    }

    async currentHeight() {
        if (this.tipHeight !== null) {
            return this.tipHeight;
        }

        const response = await fetchWithTimeout(`${this.arweaveNode}/height`);

        if (!response.ok) {
            throw new Error(`/height failed: HTTP ${response.status}`);
        }

        this.tipHeight = Number((await response.text()).trim());
        return this.tipHeight;
    }

    async weaveSizeAt(height) {
        const entry = await this.blockIndexEntry(height);
        return BigInt(entry.weave_size);
    }

    async blockIndexEntry(height) {
        if (this.entries.has(height)) {
            return this.entries.get(height);
        }

        await this.loadPageForHeight(height);

        if (!this.entries.has(height)) {
            throw new Error(`No block index entry loaded for height ${height}`);
        }

        return this.entries.get(height);
    }

    async loadPageForHeight(height) {
        const tipHeight = await this.currentHeight();

        if (height < 0 || height > tipHeight) {
            throw new Error(`Height ${height} is outside node range 0..${tipHeight}`);
        }

        const start = Math.floor(height / BLOCK_INDEX_PAGE_SIZE) * BLOCK_INDEX_PAGE_SIZE;
        const end = Math.min(start + BLOCK_INDEX_PAGE_SIZE - 1, tipHeight);
        const pageKey = `${start}-${end}`;

        if (this.loadedPages.has(pageKey)) {
            return;
        }

        const url = `${this.arweaveNode}/block_index/${start}/${end}`;
        const response = await fetchWithTimeout(url, {
            headers: {
                // Without this, Arweave nodes may return only block hashes.
                'x-block-format': '1'
            }
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`/block_index/${start}/${end} failed: HTTP ${response.status} ${body.slice(0, 200)}`);
        }

        const entries = await response.json();

        entries.forEach((entry, index) => {
            const entryHeight = end - index;

            if (!entry || !entry.weave_size) {
                throw new Error(`Invalid block index entry at height ${entryHeight}`);
            }

            this.entries.set(entryHeight, entry);
        });

        this.loadedPages.add(pageKey);
    }
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    }
    finally {
        clearTimeout(timeout);
    }
}

function stripTrailingSlash(value) {
    return value.replace(/\/$/, '');
}

function parsePositiveInteger(value, name) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return parsed;
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
