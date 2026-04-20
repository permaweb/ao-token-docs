# Running A Node

This documentation outlines the neccessary steps for running an AO Mainnet([HyperBEAM](https://github.com/permaweb/HyperBEAM)) node.

### Prerequisites

1. **Install Erlang/OTP 27**

   Erlang is required to run the Hyperbeam node server.

   ```bash
   git clone https://github.com/erlang/otp.git -b maint-27
   cd otp
   ./configure
   make
   sudo make install
   ```

   Verify installation: `erl -version`

2. **Install Rebar3**

   Rebar3 is the build tool for Erlang projects.

   ```bash
   git clone https://github.com/erlang/rebar3.git
   cd rebar3
   ./bootstrap
   sudo mv rebar3 /usr/local/bin/
   ```

   Verify installation: `rebar3 version`

3. **Install Rust**

   Rust is required for compiling native dependencies.

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

   Verify installation: `rustc --version && cargo --version`

### Clone the repository

```bash
git clone https://github.com/permaweb/hyperbeam.git
```

### Run the HyperBEAM Server

```bash
HB_PARANOID=http_request rebar3 as genesis_wasm shell
```

### Run HyperBEAM as an indexer

Set up a HyperBEAM node that indexes and serves Arweave data through your own Arweave node.

> Documentation for running an Arweave node can be found [here](https://docs.arweave.org/developers).

1. Add configuration

Create `config.json` in the HyperBEAM repository root

```json
{
  "ao-types": "generate_index=atom,max_connections=integer,num_acceptors=integer",
  "num_acceptors": 32,
  "max_connections": 512,
  "arweave_index_workers": 16,
  "arweave_index_blocks": false,
  "routes": [
    {
      "template": "^/arweave",
      "node": {
        "match": "^/arweave",
        "with": "ARWEAVE_NODE_ADDRESS"
      }
    }
  ],
  "store": [
    {
      "ao-types": "store-module=atom,scope=atom",
      "store-module": "hb_store_arweave",
      "access": ["read"],
      "scope": "remote",
      "index-store": [
        {
          "ao-types": "store-module=atom,read-only=atom",
          "store-module": "hb_store_lmdb",
          "name": "ROLLING_LMDB_PATH",
          "access": ["read", "write"],
          "max-readers": 512,
          "capacity": 68719476736
        }
      ]
    }
  ]
}
```

Replace

- `ARWEAVE_NODE_ADDRESS` with your Arweave node address
- `ROLLING_LMDB_PATH` with an absolute path where index data will be stored (e.g. `/home/user/hyperbeam-data/rolling`)

2. Run the server

Use the same `run` command specified in the [Run the HyperBEAM Server](#run-the-hyperbeam-server) section with the configuration specified.

```bash
HB_PARANOID=http_request HB_CONFIG=config.json rebar3 as genesis_wasm shell
```

3. Start indexing

```bash
curl -s "http://localhost:8734/~cron@1.0/every?interval=1-second&cron-path=~copycat@1.0/arweave&from=-1&to=-19"
```