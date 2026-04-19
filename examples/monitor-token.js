/**
 * AO Token Transfer Monitor
 *
 * This script monitors and validates token transfers on the AO network by:
 * 1. Fetching scheduled messages from a specified starting slot
 * 2. Filtering for Transfer actions
 * 3. Computing results to verify successful Credit/Debit notices
 */

/* Process ID of the AO Token being monitored */
const TOKEN_PROCESS = '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc';

/* Mainnet URL endpoint for querying schedule and computation results */
const MAINNET_URL = 'https://state.forward.computer';

/* Starting slot number - all messages from this slot forward will be processed */
const START_SLOT = 2472074;

/* Number of slots to fetch per pagination request */
const PAGE_LIMIT = 100;

/**
 * Fetches all Transfer messages from the AO network starting from START_SLOT
 *
 * This function:
 * 1. Determines the current slot number from the network
 * 2. Paginates through all slots from START_SLOT to current
 * 3. Fetches schedule data for each page of slots
 * 4. Filters messages to only include Transfer actions
 *
 * @returns {Promise<Array>} Array of message edges containing Transfer actions
 */
async function getTransfers() {
    try {
        console.log(`Reading messages from ${MAINNET_URL}...`);

        /* Step 1: Fetch the current (highest) slot number for the token process */
        let currentSlot;
        const currentSlotUrl = new URL(`${MAINNET_URL}/${TOKEN_PROCESS}~process@1.0/slot/current`);

        console.log(`Fetching current slot...`);
        const currentSlotLookup = await fetch(currentSlotUrl.toString());

        if (currentSlotLookup.ok) {
            currentSlot = await currentSlotLookup.text();
            console.log(`Current Slot: ${currentSlot}`);
        }
        else {
            console.error(`Error reading messages: ${currentSlotLookup.status}`);
            process.exit(1);
        }

        /* Step 2: Initialize pagination variables */
        let hasNextPage = true;
        let fromSlot = START_SLOT;
        let toSlot = fromSlot + PAGE_LIMIT;

        /* Array to accumulate all message edges across paginated requests */
        const allEdges = [];

        /* Step 3: Paginate through all slots from START_SLOT to currentSlot */
        while (hasNextPage) {
            /* Build the schedule query URL with pagination parameters */
            const scheduleUrl = new URL(`${MAINNET_URL}/${TOKEN_PROCESS}~process@1.0/schedule`);

            scheduleUrl.searchParams.set('from', fromSlot);
            scheduleUrl.searchParams.set('to', toSlot);
            scheduleUrl.searchParams.set('accept', 'application/aos-2');

            console.log(`Fetching page from slot ${fromSlot} to ${toSlot}...`);
            const edgesLookup = await fetch(scheduleUrl.toString());

            if (edgesLookup.ok) {
                const parsed = await edgesLookup.json();

                /* Accumulate edges from this page */
                if (parsed.edges && parsed.edges.length > 0) {
                    allEdges.push(...parsed.edges);
                    console.log(`Fetched ${parsed.edges.length} messages (total: ${allEdges.length})`);
                }

                /* Check if there are more pages to fetch */
                hasNextPage = toSlot < currentSlot;
                if (hasNextPage && parsed.edges && parsed.edges.length > 0) {
                    /* Move to the next page range */
                    fromSlot = toSlot + 1;
                    toSlot += PAGE_LIMIT;
                }
            }
            else {
                console.error(`Error fetching messages from SU: ${edgesLookup.status}`);
                /* Advance pagination even on error to avoid infinite loop */
                hasNextPage = toSlot < currentSlot;
                if (hasNextPage) {
                    fromSlot = toSlot + 1;
                    toSlot += PAGE_LIMIT;
                }
            }
        }

        /* Step 4: Filter edges to only include messages with Action=Transfer tag */
        const filteredMessages = allEdges.filter((edge) =>
            edge.node.message.Tags.some(
                (tag) => tag.name === 'Action' && tag.value === 'Transfer'
            )
        );

        console.log(`Total edges fetched: ${allEdges.length}`);
        console.log(`Total transfers found: ${filteredMessages.length}`);

        return filteredMessages;
    }
    catch (e) {
        throw new Error(e);
    }
}

/**
 * Processes each transfer message to determine success or failure
 *
 * For each transfer, this function:
 * 1. Extracts the compute slot (Nonce) from the assignment
 * 2. Fetches computation results from that slot
 * 3. Analyzes result messages to determine transfer outcome
 * 4. Categorizes as success (Credit+Debit) or error (Transfer-Error)
 *
 * @param {Array} transfers - Array of transfer message edges
 * @returns {Promise<Object>} Map of message IDs to their status and outcome
 */
async function processTransfers(transfers) {
    if (!transfers || transfers.length <= 0) return;

    /* Object to store results keyed by message ID */
    const results = {};

    try {
        /* Process each transfer message individually */
        for (const edge of transfers) {
            try {
                /* Extract the compute slot (Nonce) from the assignment tags */
                const computeSlot = edge.node.assignment.Tags.find((tag) => tag.name === 'Nonce').value;

                console.log(`Computing slot ${computeSlot}, message (${edge.node.message.Id})...`)

                /* Build URL to fetch computation results for this specific slot */
                const resultUrl = new URL(`${MAINNET_URL}/${TOKEN_PROCESS}~process@1.0/compute&slot=${computeSlot}/results`);

                resultUrl.searchParams.set('require-codec', 'application/json');
                resultUrl.searchParams.set('accept-bundle', 'true');

                const resultLookup = await fetch(resultUrl.toString());

                if (resultLookup.ok) {
                    const parsed = await resultLookup.json();

                    if (parsed.raw?.Messages?.length > 0) {
                        /* Track the action messages we care about for validation */
                        const actions = {
                            'Debit-Notice': null,
                            'Credit-Notice': null,
                            'Transfer-Error': null,
                        };

                        /* Scan through result messages to find relevant action notices */
                        for (const message of parsed.raw?.Messages) {
                            const action = message?.Tags?.find((tag) => tag.name === 'Action')?.value
                            /* Store the first occurrence of each action type */
                            if (action && actions.hasOwnProperty(action) && !actions[action]) {
                                actions[action] = message;
                            }
                        }

                        /* A successful transfer requires both Debit-Notice and Credit-Notice */
                        if (actions['Debit-Notice'] && actions['Credit-Notice']) {
                            results[edge.node.message.Id] = {
                                status: 'success',
                                message: 'Credit / Debit Found'
                            }
                        }

                        /* Transfer-Error indicates the transfer failed */
                        else if (actions['Transfer-Error']) {
                            results[edge.node.message.Id] = {
                                status: 'error',
                                message: 'Transfer-Error'
                            }
                        }
                    }
                }
                else {
                    /* Failed to fetch computation results */
                    console.log(resultLookup)
                    results[edge.node.message.Id] = {
                        status: 'error',
                        message: resultLookup.status ?? 'Error reading message result'
                    }
                }

            }
            catch (e) {
                /* Handle errors during individual transfer processing */
                console.error(e);
                results[edge.node.message.Id] = {
                    status: 'error',
                    message: e.message ?? 'Error reading message result'
                }
            }
        }

        return results;
    }
    catch (e) {
        throw new Error(e);
    }
}

/**
 * Main execution flow
 *
 * Orchestrates the monitoring process:
 * 1. Fetch all Transfer messages from START_SLOT to current slot
 * 2. Process each transfer to determine success/failure status
 * 3. Display results in a formatted table
 */
async function main() {
    try {
        /* Step 1: Read all transfers from the Scheduler Unit starting at START_SLOT */
        const transfers = await getTransfers();

        /* Step 2: Get the computation result of each transfer to validate success */
        const results = await processTransfers(transfers);

        /* Step 3: Display final results in table format - Transfer ID: { Status, Message }[] */
        if (results) console.table(results)

        process.exit(0);

    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}

/* Execute the monitoring script */
main();