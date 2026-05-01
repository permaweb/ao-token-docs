# `@permaweb/aoconnect` FAQs

## Why do I get either a message ID or an assignment slot, but not both?

When sending a transfer, `returnAssignmentSlot: true` returns the assignment slot instead of the message ID. Without it, the SDK returns the message ID.

This matters because different follow-up checks use different identifiers:

- txid / message ID: Arweave message lookup
- assignment slot: token schedule and compute-result lookup

If your integration requires both, design the send flow to retain both values rather than assuming the compute API can recover the slot from a txid.
