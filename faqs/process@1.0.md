# `~process@1.0` Token Process FAQs

## Is one slot always one message?

For the AO Token process, one slot corresponds to one scheduler assignment for one message. Slots are strictly monotonic and do not have gaps in the underlying process schedule.

If a scanner appears to skip slots, it is usually because the scanner is filtering for only a subset of messages, such as `Action=Transfer`. The skipped slots still exist; they just did not match the scanner's filter.

`Nonce` is the legacy name for the assignment slot. Treat it as the slot identifier when processing schedule results.

## Can a scheduled and computed transfer be reverted?

Once a message has an assigned slot from the authoritative scheduler and that slot has a computable transfer result, the transfer should be treated as final for AO accounting. It will not be reassigned to a different slot or rolled back by an Arweave-style reorg.

As an operational margin, high-value clients (e.g. CEXs) can wait for `N+1` or `N+2` scheduler slots after the transfer's slot before crediting. That delay is mainly for stale reads and result propagation, not because AO has chain-style reorgs at the scheduler layer.

## Do Arweave confirmations determine AO transfer finality?

No. AO execution finality is driven by the scheduler/process/compute lifecycle. Arweave settlement is still important as a permanent receipt for the message, but it is not what finalizes token execution.

If an integration is still relying on Arweave block-height based indexing during a migration, waiting for additional Arweave confirmations can reduce exposure to external indexer and bundler reseeding effects. Slot-based processing should be treated as the canonical integration path.

## Does token evaluation depend on Arweave block indexing?

No. Token evaluation and Arweave indexing are separate local-node responsibilities.

The token evaluation cron keeps the AO Token process computed up to date:

```bash
curl "http://localhost:<PORT>/~cron@1.0/every?interval=5-seconds&cron-path=0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/now"
```

Run it again after every HyperBEAM restart. If it is not running, `compute/at-slot` can fall behind the scheduler and balance/result reads from that node may be stale.

This does not index Arweave blocks for local raw DataItem lookup. The `copycat` Arweave indexing cron is what keeps local `~arweave@2.9/raw=<TXID>` coverage up to date.

## Do I need to validate the assignment `Hash-Chain` field myself?

Normally, no. Hash-chain validation is handled by the scheduler and compute unit path. Integrations should verify that the message is assigned by the expected scheduler, has the expected token process target, and has a computable transfer result.

## What are `Transfer-Error` results?

`Transfer-Error` is emitted by the token process when a transfer is invalid, such as an insufficient-balance transfer. In normal wallet flows, failed transfers are uncommon because wallets usually prevent users from submitting transfers they cannot fund.

Do not assume failures are impossible. Keep handling for `Transfer-Error` in scanners and reconciliation jobs.

## What if an address should have a balance, but my node returns 404?

The main docs already cover the normal `404` case for addresses with no balance. If the address is expected to have AO, first compare your node's evaluated slot with the current token slot.

If the node is caught up and still returns `404`, the local evaluation cache may be stale or inconsistent. Re-evaluate from a fresh LMDB store. If the same LMDB path is also used for Arweave indexing, clearing it will remove indexing state too, so plan to re-index.
