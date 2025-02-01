// Suppress deprecation warnings (fixes punycode issue)
process.env.NODE_NO_WARNINGS = "1";
process.noDeprecation = true;

const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const { Keypair } = require("@solana/web3.js");
const os = require("os");
const readline = require("readline");

const NUM_WORKERS = os.cpus().length; // Use all CPU cores
const BATCH_SIZE = 5000; // ✅ Increased batch size for even faster performance

// Base-58 encoding function (manually implemented for maximum efficiency)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeBase58(bytes) {
    let num = BigInt("0x" + Buffer.from(bytes).toString("hex"));
    let encoded = "";

    while (num > 0) {
        let remainder = num % 58n;
        num = num / 58n;
        encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
    }

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
    console.log(`\n🔧 Using ${NUM_WORKERS} CPU cores for ultra-fast generation...\n`);

    let totalAttempts = 0;
    let totalBatches = 0;
    let startTime = Date.now();
    let workersActive = NUM_WORKERS;
    let estimatedCompletionTime = "Calculating...";

    const updateTicker = setInterval(() => {
        let elapsedTime = (Date.now() - startTime) / 1000; // Elapsed time in seconds
        let speed = totalAttempts / elapsedTime; // Addresses per second

        if (speed > 0) {
            estimatedCompletionTime = `${Math.max(1, Math.floor(10_000_000 / speed))}s`; // Estimate for 10M scans
        }

        process.stdout.write(
            `\r🔄 Batches Processed: ${totalBatches} | 🏹 Addresses Scanned: ${totalAttempts.toLocaleString()} | ⏳ Estimated Completion: ${estimatedCompletionTime}   `
        );
    }, 500); // ✅ Live ticker updates every 0.5s for smooth updates

    for (let i = 0; i < NUM_WORKERS; i++) {
        const worker = new Worker(__filename, {
            workerData: { type, matchString }
        });

        worker.on("message", (data) => {
            if (data.type === "progress") {
                totalAttempts += data.attempts;
                totalBatches += 1;
                return;
            }

            // If a match is found, stop all workers immediately
            clearInterval(updateTicker);
            let elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2); // Time taken in seconds

            console.clear();
            console.log("\n✅ Vanity address found! 🎉\n");
            console.log(`📜 Public Key:  🔹 ${data.publicKey}`);
            console.log(`🔑 Private Key (Import into Phantom!):\n🟢 ${data.secretKey}\n`);
            console.log(`⏱️ Time Taken: ${elapsedTime} seconds`);
            console.log("🔒 Store your private key securely!\n");

            askToGenerateAgain(rl);
        });

        worker.on("error", (err) => console.error("❌ Worker error:", err));

        worker.on("exit", (code) => {
            workersActive--;
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
    let attempts = 0;

    while (true) {
        for (let i = 0; i < BATCH_SIZE; i++) {  // ✅ BATCH OPTIMIZATION: Generate multiple keys per iteration
            const keypair = Keypair.generate();
            const pubkey = keypair.publicKey.toBase58();
            const secretKeyBase58 = encodeBase58(Uint8Array.from(keypair.secretKey)); // ✅ Correct encoding

            attempts++;

            if ((type === "start" && pubkey.startsWith(matchString)) ||
                (type === "end" && pubkey.endsWith(matchString))) {
                
                parentPort.postMessage({
                    publicKey: pubkey,
                    secretKey: secretKeyBase58
                });

                return;
            }
        }

        parentPort.postMessage({ type: "progress", attempts: BATCH_SIZE });
    }
}

// Function to ask user if they want to generate another vanity address
function askToGenerateAgain(rl) {
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
