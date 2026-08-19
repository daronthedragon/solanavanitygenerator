// Suppress deprecation warnings (fixes punycode issue)
process.env.NODE_NO_WARNINGS = "1";
process.noDeprecation = true;

const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const { selectBackend } = require("./backends.js");
const os = require("os");
const readline = require("readline");

const NUM_WORKERS = os.cpus().length; // Use all CPU cores
const BATCH_SIZE = 5000; // ✅ Increased batch size for even faster performance

// Base-58 encoding, by long division over a small scratch array.
//
// The obvious version converts the key into one BigInt and divides that down.
// It is correct, but it allocates a fresh BigInt per digit, and at a million
// keys a second that allocation dominates. Dividing a reused byte array in
// place is roughly 4x quicker and allocates nothing per call.
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_SCRATCH = new Uint8Array(128);

function encodeBase58(bytes) {
    let length = 0;
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

    for (let i = zeros; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = 0; j < length; j++) {
            carry += B58_SCRATCH[j] << 8;
            B58_SCRATCH[j] = carry % 58;
            carry = (carry / 58) | 0;
        }
        while (carry > 0) {
            B58_SCRATCH[length++] = carry % 58;
            carry = (carry / 58) | 0;
        }
    }

    // Base-58 represents every leading zero byte as a literal "1". Dropping
    // them yields a shorter string that decodes back to different bytes, so
    // wallets refuse the import. Around 1 in 313 secret keys starts with one.
    let encoded = "";
    for (let i = 0; i < zeros; i++) encoded += BASE58_ALPHABET[0];
    for (let i = length - 1; i >= 0; i--) encoded += BASE58_ALPHABET[B58_SCRATCH[i]];
    return encoded;
}

// Function to validate the user’s input (only valid Base-58 characters allowed)
function isValidSolanaPattern(pattern) {
    return [...pattern].every(char => BASE58_ALPHABET.includes(char));
}

function startProgram() {
    console.clear();
    console.log("\n🟢 Welcome to the Solana Vanity Address Generator! 🟢");
    console.log("🔥 Created by @daronthedragon on Twitter 🔥\n");

    console.log("⚠️  Solana addresses only contain these characters:");
    console.log(`   🟡 ${BASE58_ALPHABET}`);
    console.log("🚫 Invalid characters: ❌ 0 (zero), O, I (capital i), l (lowercase L)\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("👉 Do you want the address to start with or end with your desired string? (start/end): ", function(choice) {
        choice = choice.toLowerCase().trim();
        if (choice !== "start" && choice !== "end") {
            console.log("❌ Invalid choice! Please enter 'start' or 'end'.");
            rl.close();
            return;
        }

        rl.question("🔍 Enter the desired prefix/suffix: ", function(pattern) {
            pattern = pattern.trim();
            if (!pattern) {
                console.log("❌ Invalid input! Pattern cannot be empty.");
                rl.close();
                return;
            }

            if (!isValidSolanaPattern(pattern)) {
                console.log(`❌ Invalid characters detected! Only use:\n   ${BASE58_ALPHABET}`);
                rl.close();
                return;
            }

            console.log(`\n🚀 Searching for a Solana address that ${choice === "start" ? "starts with" : "ends with"} '${pattern}'...\n`);

            startWorkerThreads(choice, pattern, rl);
        });
    });
}

if (isMainThread) {
    startProgram();
} else {
    generateVanityAddress(workerData.type, workerData.matchString);
}

// Function to start worker threads
function startWorkerThreads(type, matchString, rl) {
    // Loaded here only to report which implementation the workers will use.
    let backendName = "unknown";
    try {
        backendName = selectBackend().name;
    } catch {
        // The workers will surface the real error.
    }

    console.log(`\n🔧 Using ${NUM_WORKERS} CPU cores via ${backendName}...\n`);

    let totalAttempts = 0;
    let totalBatches = 0;
    let startTime = Date.now();
    let workersActive = NUM_WORKERS;
    let estimatedCompletionTime = "Calculating...";
    const workers = [];
    let found = false;

    // A pattern of length L needs 58^L attempts on average, since every
    // position holds one of 58 equally likely characters. The previous
    // estimate assumed a flat ten million scans whatever was being searched
    // for, which was far too hopeful for long patterns.
    const expectedAttempts = Math.pow(58, matchString.length);

    const updateTicker = setInterval(() => {
        const elapsedTime = (Date.now() - startTime) / 1000; // Elapsed time in seconds
        const speed = totalAttempts / elapsedTime; // Addresses per second

        if (speed > 0) {
            estimatedCompletionTime = formatDuration(expectedAttempts / speed);
        }

        process.stdout.write(
            `\r🔄 ${totalBatches} batches | 🏹 ${totalAttempts.toLocaleString()} scanned | ⚡ ${Math.round(speed).toLocaleString()}/sec | ⏳ ~${estimatedCompletionTime} expected   `
        );
    }, 500); // ✅ Live ticker updates every 0.5s for smooth updates

    for (let i = 0; i < NUM_WORKERS; i++) {
        const worker = new Worker(__filename, {
            workerData: { type, matchString }
        });
        workers.push(worker);

        worker.on("message", (data) => {
            if (data.type === "progress") {
                totalAttempts += data.attempts;
                totalBatches += 1;
                return;
            }

            // Two workers can match in the same tick. First one wins.
            if (found) return;
            found = true;

            // If a match is found, stop all workers immediately.
            // Without this they keep looping at full tilt on every core while
            // the result sits on screen waiting for an answer.
            clearInterval(updateTicker);
            for (const w of workers) w.terminate();
            let elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2); // Time taken in seconds

            console.clear();
            console.log("\n✅ Vanity address found! 🎉\n");
            console.log(`📜 Public Key:  🔹 ${data.publicKey}`);
            console.log(`🔑 Private Key (Import into Phantom!):\n🟢 ${data.secretKey}\n`);
            const rate = Math.round(totalAttempts / Math.max(Number(elapsedTime), 0.001));
            console.log(`⏱️ Time Taken: ${elapsedTime} seconds — ${totalAttempts.toLocaleString()} addresses at ${rate.toLocaleString()}/sec via ${data.backend}`);
            console.log("🔒 Store your private key securely!\n");

            askToGenerateAgain(rl);
        });

        worker.on("error", (err) => console.error("❌ Worker error:", err));

        worker.on("exit", (code) => {
            workersActive--;
            // After a match every worker is torn down on purpose, so a
            // non-zero code here is expected rather than a failure.
            if (found) return;
            if (code !== 0) console.error(`⚠️ Worker stopped with exit code ${code}`);
            if (workersActive === 0) {
                console.log("❌ No workers remaining. Exiting...");
                process.exit(1);
            }
        });
    }
}

// Function to generate a vanity address inside a worker thread
function generateVanityAddress(type, matchString) {
    const backend = selectBackend();

    while (true) {
        for (let i = 0; i < BATCH_SIZE; i++) {  // ✅ BATCH OPTIMIZATION: Generate multiple keys per iteration
            // Only the public key is needed to test the pattern. Encoding the
            // secret key too costs more than the test itself, and 99.999% of
            // the time the result is thrown away, so it waits for a match.
            const address = encodeBase58(backend.next());

            const hit = type === "start"
                ? address.startsWith(matchString)
                : address.endsWith(matchString);

            if (hit) {
                parentPort.postMessage({
                    publicKey: address,
                    secretKey: encodeBase58(backend.secret()),
                    backend: backend.name
                });

                return;
            }
        }

        parentPort.postMessage({ type: "progress", attempts: BATCH_SIZE });
    }
}

/** Seconds into something readable at a glance. */
function formatDuration(seconds) {
    if (!isFinite(seconds)) return "unknown";
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)} days`;
}

// Function to ask user if they want to generate another vanity address
function askToGenerateAgain(rl) {
    // stdin is not always a terminal. Driven from a pipe or a script, readline
    // has already closed by the time a match lands, and asking another question
    // throws ERR_USE_AFTER_CLOSE — a stack trace printed directly beneath the
    // key the user came for.
    if (rl.closed) {
        console.log("👋 Done. Store your private key securely!\n");
        process.exit(0);
    }

    rl.question("🔁 Would you like to generate another vanity address? (yes/no): ", function(answer) {
        answer = answer.toLowerCase().trim();
        if (answer === "yes" || answer === "y") {
            startProgram();
        } else {
            console.log("\n👋 Exiting program. Have a great day!\n");
            process.exit(0);
        }
    });
}
