# `@permaweb/aoconnect` FAQs

## Can I broadcast AO Token transfers with the `~process@1.0/push` endpoint?

No. The push endpoint is not supported for AO Token transfers. A `403` from a public compute node is expected here; it is not an access level that exchanges should request for token transfers.

Use the `@permaweb/aoconnect` transfer flow described in the main integration docs instead of posting ANS-104 DataItems to `~process@1.0/push`.

## Why do I get either a message ID or an assignment slot, but not both?

When sending a transfer, `returnAssignmentSlot: true` returns the assignment slot instead of the message ID. Without it, the SDK returns the message ID.

This matters because different follow-up checks use different identifiers:

- txid / message ID: Arweave message lookup
- assignment slot: token schedule and compute-result lookup

If your integration requires both, design the send flow to retain both values rather than assuming the compute API can recover the slot from a txid.
