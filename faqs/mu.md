# MU and Bundler FAQs

## Does a self-hosted MU wallet need AR to submit AO messages?

Not necessarily. If the MU is configured to upload through `up.arweave.net`, the bundler can subsidize Arweave storage costs for AO messages up to its configured per-transaction limit.

This means the MU wallet does not necessarily need an AR balance just to submit AO messages through that bundler path.

The support discussions referenced a 5 MB per-transaction bundler subsidy limit. Treat that as an operational bundler limit, not a token-protocol rule.

## What should I do if a production MU or node may hit rate limits?

Share the production node or MU IPs with the AO team so they can be allowlisted where appropriate. This is operationally separate from token correctness, but it matters for reliable high-volume users infrastructure.
