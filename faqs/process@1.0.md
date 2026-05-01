# `~process@1.0` Token Process FAQs


## What if an address should have a balance, but my node returns 404?

The main docs already cover the normal `404` case for addresses with no balance. If the address is expected to have AO, first compare your node's evaluated slot with the current token slot.

If the node is caught up and still returns `404`, the local evaluation cache may be stale or inconsistent. Re-evaluate from a fresh LMDB store. If the same LMDB path is also used for Arweave indexing, clearing it will remove indexing state too, so plan to re-index.
