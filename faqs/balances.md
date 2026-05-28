# AO Token Balance FAQs

## MEXC asks: Can we get the balance of an address at a given AO scheduler slot?

Yes. For AO Token, the relevant height is the AO scheduler slot.

Balance at slot:

```bash
curl "http://127.0.0.1:<PORT>/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/<ADDRESS>?slot=<SLOT>"
```

This returns the balance after that AO slot has been computed. If you need the balance before a transfer at slot `N`, query slot `N - 1`; if you need the balance after it, query slot `N`.

Public infrastructure nodes can be used for spot checks, but they do not guarantee historical balance availability for every address at every slot. For production usage, use your own evaluated node or a custom indexer.

N.B. A `400` no-balance response means the address has `0` balance at that slot. Some public endpoints may return `404` for the same no-balance condition.
