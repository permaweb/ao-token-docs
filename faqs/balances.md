# AO Token Balance FAQs

## How to get the balance of an address at a given AO scheduler slot?

Balance at slot:

```bash
curl "http://127.0.0.1:<PORT>/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/<ADDRESS>?slot=<SLOT>"
```

This returns the balance after that AO slot has been computed. If you need the balance before a transfer at slot `N`, query slot `N - 1`; if you need the balance after it, query slot `N`.

Public infrastructure nodes can be used for spot checks, but they do not guarantee historical balance availability for every address at every slot. For production usage, use your own evaluated node or a custom indexer (if any).

> N.B. A `404` no-balance response means the address has `0` balance at that slot.

## How to get the current balance of an address?

Use the same balance endpoint without the `slot` query parameter:

```bash
curl "http://127.0.0.1:<PORT>/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/<ADDRESS>"
```

This returns the latest balance available from that node's current evaluated AO Token state.

To check how far the node has evaluated the token process:

```bash
curl "http://127.0.0.1:<PORT>/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/at-slot"
```

Compare that value with the current scheduler slot:

```bash
curl "https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/slot/current"
```