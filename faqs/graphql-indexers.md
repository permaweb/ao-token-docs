# Arweave GraphQL and External Indexer FAQs

## Can the same AO DataItem appear under different Arweave block heights?

Yes, when using external GraphQL or explorer indexes keyed by Arweave block height. Bundler retry and reseeding behavior can cause a DataItem to be observed under one block height and later resolve under another height as indexing settles.

This is an Arweave indexing and bundler-settlement concern, not an AO scheduler-slot concern. The AO slot assigned by the scheduler is the stable identifier for token processing.

## Does this only happen with one GraphQL provider?

No. This behavior is not specific to one GraphQL provider. It can happen whenever the indexer view depends on Arweave block-height association before bundler settlement has fully stabilized.

## Will waiting for more Arweave confirmations help a block-height based flow?

It can reduce the issue for legacy block-height based flows because bundler reseeding is more likely to have completed after additional Arweave confirmations. During migration, waiting for a larger confirmation window is a reasonable mitigation.

For AO Token integration, the long-term fix is to use scheduler slots and computed transfer results rather than Arweave block-height queries as the canonical deposit path.

## Should exchange deposit scanners use Arweave block height as the canonical cursor?

No. Use AO scheduler slots as the canonical cursor for token transfer scanning. Arweave block height is useful for message permanence and external receipt workflows, but it is not the stable ordering primitive for AO Token execution.
