/**
 * Resolve bundled AO DataItem IDs to Arweave block heights.
 *
 * lookup path:
 * 1. HEAD {HB_NODE}/~arweave@2.9/raw=<DATAITEM_ID>
 *    - read the `offset` header
 * 2. HEAD {HB_NODE}/~arweave@2.9/status
 *    - read the current Arweave `height` header
 * 3. Binary search with HEAD {HB_NODE}/~arweave@2.9/block=<HEIGHT>
 *    - find the first block whose `weave_size` is greater than the offset
 *
 * Usage:
 *   node examples/dataitem-block-height.js <DATAITEM_ID> [DATAITEM_ID...]
 *
 * Environment:
 *   HB_NODE=https://arweave.net
 *   REQUEST_TIMEOUT_MS=30000
 *   REQUEST_RETRIES=2
 */

const DATAITEM_IDS = process.argv.slice(2);

const HB_NODE = stripTrailingSlash(process.env.HB_NODE || 'https://arweave.net');
const REQUEST_TIMEOUT_MS = parsePositiveInteger(
    process.env.REQUEST_TIMEOUT_MS || '30000',
    'REQUEST_TIMEOUT_MS'
);
const REQUEST_RETRIES = parseNonNegativeInteger(
    process.env.REQUEST_RETRIES || '2',
    'REQUEST_RETRIES'
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
    let low = 0;
    let high = await getCurrentHeight();

    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const weaveSize = await getBlockWeaveSize(middle);

        if (weaveSize > offset) {
            high = middle;
        }
        else {
            low = middle + 1;
        }
    }

    const block = await getBlockHeader(low);
    const blockEndOffset = BigInt(block.weaveSize);

    if (blockEndOffset <= offset) {
        throw new Error(`Offset ${offset} is beyond indexed weave size ${blockEndOffset}`);
    }

    const previousWeaveSize = low === 0 ? 0n : await getBlockWeaveSize(low - 1);

    return {
        height: low,
        hash: block.indepHash,
        txRoot: block.txRoot,
        blockStartOffset: previousWeaveSize,
        blockEndOffset
    };
}

async function getCurrentHeight() {
    const url = `${HB_NODE}/~arweave@2.9/status`;
    const response = await fetchWithTimeout(url, {
        method: 'HEAD'
    });

    if (!response.ok) {
        throw new Error(`HyperBEAM status lookup failed: HTTP ${response.status}`);
    }

    const height = response.headers.get('height');
    if (!height) {
        throw new Error('HyperBEAM status lookup returned no height header');
    }

    return Number(height);
}

const blockHeaderCache = new Map();

async function getBlockWeaveSize(height) {
    const block = await getBlockHeader(height);
    return BigInt(block.weaveSize);
}

async function getBlockHeader(height) {
    if (blockHeaderCache.has(height)) {
        return blockHeaderCache.get(height);
    }

    const url = `${HB_NODE}/~arweave@2.9/block=${height}`;
    const response = await fetchWithTimeout(url, {
        method: 'HEAD'
    });

    if (response.status === 404) {
        throw new Error(`HyperBEAM block ${height} is not indexed`);
    }
    if (!response.ok) {
        throw new Error(`HyperBEAM block ${height} lookup failed: HTTP ${response.status}`);
    }

    const weaveSize = response.headers.get('weave_size');
    if (!weaveSize) {
        throw new Error(`HyperBEAM block ${height} returned no weave_size header`);
    }

    const block = {
        height,
        weaveSize,
        indepHash: response.headers.get('indep_hash'),
        txRoot: response.headers.get('tx_root')
    };

    blockHeaderCache.set(height, block);
    return block;
}

async function fetchWithTimeout(url, options = {}) {
    const method = options.method || 'GET';

    for (let attempt = 1; attempt <= REQUEST_RETRIES + 1; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        }
        catch (error) {
            const isLastAttempt = attempt > REQUEST_RETRIES;
            const message = error.name === 'AbortError'
                ? `${method} ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`
                : `${method} ${url} failed: ${error.message}`;

            if (isLastAttempt) {
                throw new Error(message);
            }

            await sleep(500 * attempt);
        }
        finally {
            clearTimeout(timeout);
        }
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

function parseNonNegativeInteger(value, name) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }

    return parsed;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
