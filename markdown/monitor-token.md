# AO Token Transfer Monitor

## Overview

This [script](../examples/monitor-token.js) monitors and validates token transfers on the AO network. It fetches scheduled messages from the AO mainnet, identifies Transfer actions, and verifies their success by checking for Credit and Debit notices in the computation results.

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `TOKEN_PROCESS` | `0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc` | Process ID of the AO token being monitored |
| `MAINNET_URL` | `https://state.forward.computer` | Mainnet endpoint for querying schedule and computation |
| `START_SLOT` | `2472074` | Starting slot number - all messages from this slot forward are processed |
| `PAGE_LIMIT` | `100` | Number of slots to fetch per pagination request |

## How It Works

### 1. Fetch Transfer Messages (`getTransfers()`)

The script retrieves all Transfer messages from the AO network starting from a specified slot.

**Steps:**
1. **Get Current Slot** - Determines the latest slot number from the network
2. **Paginate Through Slots** - Fetches schedule data for slots in batches
3. **Filter Transfers** - Identifies messages with `Action=Transfer` tag
4. **Return Results** - Returns array of Transfer message edges

### 2. Process Transfers (`processTransfers()`)

For each transfer, the script validates whether it succeeded or failed.

**Steps:**
1. **Extract Compute Slot** - Gets the Nonce (compute slot) from assignment tags
2. **Fetch Computation Results** - Retrieves results for the specific slot
3. **Analyze Result Messages** - Looks for action notices in the results
4. **Categorize Outcome** - Determines success/failure based on notices found

**Success Criteria:**
- Transfer is **successful** if both `Debit-Notice` AND `Credit-Notice` are present
- Transfer is **failed** if `Transfer-Error` is present
- Transfer is **error** if computation results cannot be fetched

### 3. Display Results

Outputs a formatted table showing each transfer's message ID, status, and outcome message.

---

## API Endpoints

### Endpoint 1: Get Current Slot

**URL:**
```
GET {MAINNET_URL}/{TOKEN_PROCESS}~process@1.0/slot/current
```

**Example:**
```
GET https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/slot/current
```

**Response:**
```
2460711
```

**Description:** Returns the current (highest) slot number for the token process.

---

### Endpoint 2: Get Schedule (Paginated)

**URL:**
```
GET {MAINNET_URL}/{TOKEN_PROCESS}~process@1.0/schedule?from={fromSlot}&to={toSlot}&accept=application/aos-2
```

**Example:**
```
GET https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/schedule?from=2460711&to=2460811&accept=application/aos-2
```

**Query Parameters:**
- `from` - Starting slot number (inclusive)
- `to` - Ending slot number (inclusive)
- `accept` - Content type specification (`application/aos-2`)

> Note: The API returns `to` inclusively in practice. To avoid duplicate results when paginating, the next page should start from `to + 1`.

**Response:**
```json
{
  "edges": [
    {
      "node": {
        "message": {
          "Id": "message-id",
          "Tags": [
            {
              "name": "Action",
              "value": "Transfer"
            }
          ]
        },
        "assignment": {
          "Tags": [
            {
              "name": "Nonce",
              "value": "2460712"
            }
          ]
        }
      }
    }
  ]
}
```

**Description:** Fetches scheduled messages within a slot range. The script paginates through all slots from `START_SLOT` to the current slot, fetching 100 slots at a time.

---

### Endpoint 3: Get Computation Results

**URL:**
```
GET {MAINNET_URL}/{TOKEN_PROCESS}~process@1.0/compute&slot={computeSlot}/results?require-codec=application/json&accept-bundle=true
```

**Example:**
```
GET https://state.forward.computer/0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc~process@1.0/compute&slot=2460712/results?require-codec=application/json&accept-bundle=true
```

**Query Parameters:**
- `require-codec` - Specifies response format (`application/json`)
- `accept-bundle` - Boolean to accept bundled results (`true`)

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

**Description:** Retrieves computation results for a specific slot. The script analyzes the `Messages` array to find:
- `Debit-Notice` - Indicates sender's balance was debited
- `Credit-Notice` - Indicates recipient's balance was credited
- `Transfer-Error` - Indicates transfer failed

---

## Execution Flow

```
┌─────────────────────────────────────────┐
│ 1. Get Current Slot                     │
│    GET /slot/current                    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 2. Paginate Through Schedule            │
│    GET /schedule (from START_SLOT)      │
│    - Fetch 100 slots at a time          │
│    - Filter for Action=Transfer         │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 3. For Each Transfer:                   │
│    a. Extract compute slot (Nonce)      │
│    b. GET /compute&slot={slot}/results  │
│    c. Check for:                        │
│       • Debit-Notice + Credit-Notice    │
│         → SUCCESS                       │
│       • Transfer-Error                  │
│         → ERROR                         │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 4. Display Results Table                │
│    Message ID | Status | Message        │
└─────────────────────────────────────────┘
```

---

## Output Format

The script outputs results as a table:

```
┌─────────────┬──────────┬─────────────────────────┐
│  (index)    │  status  │        message          │
├─────────────┼──────────┼─────────────────────────┤
│ message-id1 │ 'success'│ 'Credit / Debit Found'  │
│ message-id2 │ 'error'  │ 'Transfer-Error'        │
│ message-id3 │ 'error'  │ '404'                   │
└─────────────┴──────────┴─────────────────────────┘
```

**Status Values:**
- `success` - Transfer completed (both Debit-Notice and Credit-Notice found)
- `error` - Transfer failed (Transfer-Error found or computation fetch failed)

---

## Running the Script

```bash
node monitor-token.js
```

**Expected Console Output:**
```
Reading messages from https://state.forward.computer...
Fetching current slot...
Current Slot: 2460711
Fetching page from slot 2460711 to 2460811...
Fetched 87 messages (total: 87)
Total edges fetched: 87
Total transfers found: 23
Computing slot 2460712, message (abc123...)...
Computing slot 2460713, message (def456...)...
...
┌─────────┬──────────┬─────────────────────────┐
│ (index) │  status  │        message          │
└─────────┴──────────┴─────────────────────────┘
```

---

## Error Handling

The script handles several error scenarios:

1. **Current Slot Fetch Failed** - Exits with status code 1
2. **Schedule Fetch Failed** - Logs error and advances to next page to prevent infinite loop
3. **Result Fetch Failed** - Records error status with HTTP status code
4. **Processing Error** - Records error status with error message
5. **General Exception** - Logs error and exits with status code 1
