# `~arweave@2.9` FAQs

## Why does public `arweave.net` return 200 but my local node returns 404?

This usually means the data exists publicly, but your local node has not indexed the offset for that transaction or DataItem.

The public gateway and the local node do not share index state:

- public success means the public gateway has the offset
- local `404` means the local offset store does not have that entry, or the node is reading from a different store path than expected

For bundled AO messages, make sure the bundle's Arweave block has been indexed locally and that child DataItem offsets were written.

## What is the practical difference between raw lookup and direct transaction lookup?

The raw route depends on offset index state. Direct transaction lookup can resolve through a different path and may work even when the local raw offset lookup has not caught up.

Example:

```bash
# Direct transaction/DataItem lookup (can resolve through arweave.net)
curl -i -L "http://127.0.0.1:<PORT>/<TXID>"

# Raw offset lookup
curl -I "http://127.0.0.1:<PORT>/~arweave@2.9/raw=<TXID>"
```

Use this distinction when debugging: if direct lookup works locally but raw lookup returns `404`, focus on local offset indexing rather than message existence.

## How long can raw lookup lag direct lookup?

Direct lookup by ID can become available immediately through the gateway path, while the raw offset route may take longer because it depends on offset index state. In exchange support testing, raw lookup commonly lagged by roughly 15-20 minutes.

If `/<TXID>` works but `/~arweave@2.9/raw=<TXID>` returns `404`, do not treat that as proof the message is missing. Treat it as an offset-indexing delay or local-indexing issue until raw lookup catches up.

## How do I get the Arweave tip height from a HyperBEAM node?

Use the `~arweave@2.9` status route and read the `height` response header/value:

```bash
curl -I "http://127.0.0.1:<PORT>/~arweave@2.9/status"
```
