# `~copycat@1.0` Indexing FAQs

## Can `copycat` index only one AO process?

No. `copycat` indexes by Arweave block range. Filter for the token process after reading indexed messages; do not expect the indexing job itself to target one process ID.

## Why did the rolling indexer miss an older transaction?

A rolling command with a range like `from=-1&to=-19` follows a small window near the current Arweave tip. It does not backfill older blocks that were already outside that window when the job started.

For an older transaction, identify the Arweave block height containing the bundle and run `copycat` against that explicit height or range.

## What does `mode=list` show?

`mode=list` lists L1 transaction IDs for the requested block range. If the target AO message is a bundled DataItem, the listed ID may be the parent bundle transaction rather than the child DataItem ID.

If the parent bundle was indexed correctly, the child DataItem's offset should still become available through the `~arweave@2.9` raw lookup.

## Why can a block be listed but the DataItem still return 404?

That usually means block-level indexing has reached the block, but the local offset entry for the child DataItem was not written or is not being read from the expected local index store. Check whether the HyperBEAM process is using the config and LMDB path you think it is using.
