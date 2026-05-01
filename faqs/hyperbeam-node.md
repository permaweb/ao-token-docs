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

## Why does checkpoint import return a 500 from a Dockerized node?

If a Docker image was built or started without the `genesis_wasm` profile, checkpoint import can fail even when the node otherwise appears healthy.

Check the Docker build/start path for these forms:

```bash
rebar3 as genesis_wasm release
rebar3 as genesis_wasm shell
```

Using plain `rebar3 release` or `rebar3 shell` can miss code needed by the token checkpoint import path.

## Why does changing `/graphql` from `node` to `nodes` break startup?

The `/graphql` route expects `nodes` to be an array of upstream prefixes. If config shape is wrong, the node may start incorrectly or fail when indexing.

Use the shape from the current `running-a-node.md` config as the source of truth. If a custom config only includes a partial route/store set, HyperBEAM may miss defaults that the full config supplies.

## Can I use a public Arweave gateway for node indexing?

Arweave does not have the same public RPC model as many account-based chains. Public gateways are useful for reads, but indexing flows often need access to an Arweave node that permits the required reads and can avoid gateway rate limits.

When setting up Arweave peers, `peers.arweave.xyz` can be used as the peer source.
