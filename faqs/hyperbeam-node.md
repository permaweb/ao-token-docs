# HyperBEAM Node Operations FAQs

## Why does my node work without `config.json`, but fail with it?

Without `config.json`, HyperBEAM uses defaults. With `config.json`, the node uses the configured port, routes, stores, and remote nodes.

When behavior changes after adding config, verify:

- the startup command includes `HB_CONFIG=config.json`
- startup logs show the expected config values
- the request is going to the configured port
- the LMDB `name` paths match the directories you intend to use
- `/arweave` routes point to the intended Arweave node or gateway

## Why are requests still going to an unexpected internal IP?

If a request is routed to an internal IP even though `config.json` points elsewhere, the running node may not have loaded the config you edited. Check the exact startup command and startup logs before debugging the endpoint itself.

## Where is the local cache?

If no store path is configured, cache state is usually written under the HyperBEAM project directory. If the config sets LMDB `name` values, those configured paths are the source of truth.

Be careful when deleting local state: if evaluation and indexing share the same LMDB path, deleting that path clears both token evaluation state and local Arweave indexing state.

## Can I use a public Arweave peers for node indexing?

Arweave does not have the same public RPC model as many account-based chains. Public gateways are useful for reads, but indexing flows often need access to an Arweave node that permits the required reads and can avoid gateway ratelimits.

When setting up Arweave peers, `peers.arweave.xyz` can be used as the peer source.
