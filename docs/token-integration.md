# AO Token Mainnet Integration

This documentation outlines the neccessary steps for integrating with the [AO](https://ao.arweave.net/) Token. It includes technical steps for sending transfers, performing lookups, and verification.

There are two AO Mainnet URLs are referenced throughout this document for compute and indexing of the AO token process. To run your own node that can both evaluate and index the token, see [Running A Node](./running-a-node.md). Note while two different nodes are used here, both compute and indexing can run on the same node.

The AO mainnet nodes used in this documentation are:

- Compute: [https://state.forward.computer](https://state.forward.computer)
- Indexer: [https://arweave.net](https://arweave.net)

## Table of Contents

-   [Overview](#overview)
-   [Quick Start](#quick-start)
-   [Token Interactions](#token-interactions)
    -   [Sending Transfers](#sending-transfers)
    -   [Reading Transfers](#reading-transfers)
    -   [Verifying Transfers](#verifying-transfers)
    -   [Reading Balances](#reading-balances)
-   [Token Evaluation](#token-evaluation)

## Overview

AO Mainnet nodes contain all of the features needed for interactions with the AO token in one service. This includes reading the process schedule, computing message results, reading user balances, and ensuring messages are permanently stored on Arweave through an indexer.

## Quick Start

A working example of reading and verifying AO transfer messages can be found [here](../examples/monitor-token.js). This script scans transfer messages from the scheduler based on a configurable start slot and computes each message result, indicating whether or not the transfer was successful. Documentation for this script can be found [here](./monitor-token.md).

## Token Interactions

Each section below outlines steps for interacting with the AO Token Process

> AO Token Process ID: `0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc`

### Sending Transfers

The `@permaweb/aoconnect` SDK can be used to create AO transfer messages. This JS SDK can be installed into your project with the following:

```bash
npm install @permaweb/aoconnect
```

Usage

```js
import fs from 'fs';

import { connect, createSigner } from '@permaweb/aoconnect';

const ao = connect({ MODE: 'legacy' });

const message = await ao.message({
   process: '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc',
   signer: createSigner(fs.readFileSync(process.env.PATH_TO_WALLET)),
   tags: [
       { name: 'Action', value: 'Transfer' },
       { name: 'Quantity', value: <TRANSFER_QUANTITY> },
       { name: 'Recipient', value: <RECIPIENT_ADDRESS> },
   ],
   returnAssignmentSlot: true,
});
```

> Note: `returnAssignmentSlot` is an optional flag to return the assignment slot instead of the Message ID

### Reading Transfers

Transfer messages can be found from the process scheduler by a range of slots provided to the request.

Example

```bash
https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/schedule?from=2460711&to=2460811&accept=application/aos-2
```

### Verifying Transfers

To compute the result of a transfer message, an assignment slot can be passed to the following request.

Example

```bash
https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute&slot=2460711/results?require-codec=application/json&accept-bundle=true
```

The `raw` key in the response will contain messages indicating a success or failure with these tags:

Success
- `Debit-Notice` - Indicates sender's balance was debited
- `Credit-Notice` - Indicates recipient's balance was credited

Failure
- `Transfer-Error` - Indicates transfer failed

**Response:**
```json
{
  "raw": {
    "Messages": [
      {
        "Tags": [
          {
            "name": "Action",
            "value": "Debit-Notice"
          }
        ]
      },
      {
        "Tags": [
          {
            "name": "Action",
            "value": "Credit-Notice"
          }
        ]
      }
    ]
  }
}
```

#### Ensuring Messages Are Permanently Stored on Arweave

See [Messages on Arweave](./messages-on-arweave.md) for examples of ensuring AO messages are permanently stored on [Arweave](https://arweave.org).

### Reading Balances

To read the balance of a user holding AO, the following request can be used.

`https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/<ADDRESS>`

Example

```bash
curl "https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/uf_FqRvLqjnFMc8ZzGkF4qWKuNmUIQcYP0tPlCGORQk"
```

> AO uses 12 decimal places for denomination, with the smallest unit called an armstrong.

> Note: if a user does not have a balance, this call returns a 404 error, not a balance of 0. An example of this can be found [here](https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/balances/k7gAZlNygV4B5yC0z6xjE88E-uWuftJ9sImKuVhFxMc).

## Token Evaluation

Below is a list of requests to run to evaluate the AO token process on your node, once complete your node will be able to both read the schedule of the process and compute message results. See documentation for running your own node [here](./running-a-node.md).

#### Evaluate the AO Token

1. Import from a checkpoint

> Checkpoint from March 24 2026: `mlcO-cm12-83azzPWHXKOzVAq3dFBWAYBsqXvQSKaI4`. Only messages from this date forward can be evaluated.

> It is possible to evaluate the token from scratch (not using a checkpoint) however please note it could take multiple days to complete as there are over 2 million messages in the token schedule. To evalute the token from slot 0, skip to step 2.

```bash
curl "http://localhost:8734/~genesis-wasm@1.0/import=mlcO-cm12-83azzPWHXKOzVAq3dFBWAYBsqXvQSKaI4?process-id=0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc"
```

2. Start evaluating the process

```bash
curl "http://localhost:8734/~cron@1.0/once?cron-path=0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/now"
```

3. Check hydration progress

```bash
curl "http://localhost:8734/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute/at-slot"
```

> Compare this value with the current slot of the process found from the scheduler

```bash
curl "https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/slot/current"
```

---

4. Once the token process has caught up, set a cron interval to ensure the process stays up to date.

```bash
curl "http://localhost:8734/~cron@1.0/every?interval=5-seconds&cron-path=0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/now"
```