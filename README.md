# AO Token Docs

Documentation for interacting with the [AO](https://ao.arweave.net) Token.

AO is a decentralized compute system where countless parallel processes interact within a single, cohesive environment. Built on the AO-Core protocol, it uses the actor model inspired by Erlang - each process operates independently yet connects through native message-passing, creating a web of autonomous computation.

AO-Core is a protocol built to enable decentralized computations, offering a series of universal primitives to achieve this end. Instead of enforcing a single, monolithic architecture, AO-Core provides a framework into which any number of different computational models, encapsulated as primitive devices, can be attached.

## Table of Contents

- [Messages on Arweave](#messages-on-arweave)
- [Monitor Token](#monitor-token)
- [Running A Node](#running-a-node)
- [Token Integration](#token-integration)

---

## Messages on Arweave

Verify that AO messages are permanently stored on Arweave by making HTTP requests to indexer nodes, confirming both data existence and location within the weave.

[Read full documentation →](./docs/messages-on-arweave.md)

## Monitor Token

Monitor and validate AO token transfers by fetching scheduled messages, identifying Transfer actions, and verifying success through Credit and Debit notices in computation results.

[Read full documentation →](./docs/monitor-token.md)

## Running A Node

Set up and run an AO Mainnet (HyperBEAM) node with indexing capabilities, including prerequisites, configuration, and server setup instructions.

[Read full documentation →](./docs/running-a-node.md)

## Token Integration

Integrate with the AO Token by learning how to send transfers, read balances, verify transactions, and evaluate the token process on your own node.

[Read full documentation →](./docs/token-integration.md)