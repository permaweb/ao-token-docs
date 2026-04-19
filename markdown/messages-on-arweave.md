# AO Messages on Arweave

You can verify that an AO message is permanently stored on Arweave by making specific HTTP requests to an indexer node. These requests confirm both the existence of the data and its exact location within the weave.

The indexer node used in these examples is [https://arweave.net](https://arweave.net). To run your own node as an indexer, see the [indexer](./running-a-node#run-hyperbeam-as-an-indexer) section in [Running A Node](./running-a-node).

**Key Points**

- A HEAD request to `/~arweave@2.9/raw=<TXID>` returning a `200` status indicates the DataItem has been successfully indexed  
- DataItems are only indexed if the bundle containing them exists on Arweave  
- As a result, a successful response confirms the data is permanently stored on the network  
- The `/~arweave@2.9/raw=<TXID>` response also includes offset-related metadata  
- These offsets map the data to a precise byte position within the weave  
- This makes it possible to pinpoint exactly where the data resides in the network  
- Additionally, following redirects on `/<TXID>` exposes transaction and DataItem tags via response headers  

---

**Example Requests**

Retrieve Offsets

`curl -I https://arweave.net/~arweave@2.9/raw=<TXID>`

Example

```bash
curl -I https://arweave.net/~arweave@2.9/raw=UK6dqxdmURc0Qo46GjPrmrUHb2T4hRfx7lwO0IHvpEk
```

---

Retrieve Transaction Tags (via Redirects)

`curl -i -L https://arweave.net/<TXID>`

Example

```bash
curl -i -L https://arweave.net/UK6dqxdmURc0Qo46GjPrmrUHb2T4hRfx7lwO0IHvpEk
```