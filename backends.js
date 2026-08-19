// Keypair generation backends, fastest first.
//
// Deriving an Ed25519 public key is the whole cost of a vanity search — the
// pattern check is free by comparison — so the generator is only ever as fast
// as this file. Three implementations are tried in order and the first one
// that loads wins, which keeps the tool installable everywhere without giving
// up speed where the fast path is available.
//
// Measured on a 16-core desktop, full attempts per second per core:
//
//   libsodium     ~85,000   native, ships prebuilt binaries
//   node crypto   ~44,000   built into Node, no dependency at all
//   tweetnacl      ~4,500   pure JS, the original implementation
//
// Every backend returns the same thing: a 32-byte public key and the 64-byte
// secret key Solana wallets expect, which is the 32-byte seed followed by the
// 32-byte public key.

const crypto = require("crypto");

/** DER prefix that wraps a raw 32-byte Ed25519 seed as a PKCS#8 private key. */
const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function libsodiumBackend() {
    const sodium = require("sodium-native");

    // Reused across every attempt. Copying only happens on a match, which is
    // once per run rather than millions of times.
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
    const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
    const seed = Buffer.alloc(sodium.crypto_sign_SEEDBYTES);

    return {
        name: "libsodium",
        next() {
            crypto.randomFillSync(seed);
            sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed);
            return publicKey;
        },
        secret() {
            return Buffer.from(secretKey);
        },
    };
}

function nodeCryptoBackend() {
    // Ed25519 arrived in Node 12. Exporting as JWK is markedly cheaper than
    // DER here because it skips the ASN.1 encoding we would only decode again.
    let current = null;

    const backend = {
        name: "node crypto",
        next() {
            current = crypto.generateKeyPairSync("ed25519", {
                publicKeyEncoding: { format: "jwk" },
            });
            return Buffer.from(current.publicKey.x, "base64url");
        },
        secret() {
            // The private key stays a KeyObject until a match makes it worth
            // exporting, so the losing 99.999% of attempts never pay for it.
            const jwk = current.privateKey.export({ format: "jwk" });
            return Buffer.concat([
                Buffer.from(jwk.d, "base64url"),
                Buffer.from(jwk.x, "base64url"),
            ]);
        },
    };

    // Fail loudly here rather than millions of iterations later.
    backend.next();
    return backend;
}

function tweetnaclBackend() {
    const { Keypair } = require("@solana/web3.js");
    let current = null;

    return {
        name: "tweetnacl",
        next() {
            current = Keypair.generate();
            return Buffer.from(current.publicKey.toBytes());
        },
        secret() {
            return Buffer.from(current.secretKey);
        },
    };
}

/**
 * Pick the fastest backend this machine can actually load.
 *
 * sodium-native is a native module. It ships prebuilt binaries for common
 * platforms, but on anything unusual it needs a C++ toolchain and will fail to
 * install — hence the fallbacks, and hence it being an optional dependency.
 */
function selectBackend() {
    const attempts = [libsodiumBackend, nodeCryptoBackend, tweetnaclBackend];
    const problems = [];

    for (const make of attempts) {
        try {
            return make();
        } catch (err) {
            problems.push(err.message);
        }
    }

    throw new Error(`No keypair backend available:\n  ${problems.join("\n  ")}`);
}

/** Seed a keypair deterministically, so a backend can be checked against a known answer. */
function fromSeed(seed) {
    const key = crypto.createPrivateKey({
        key: Buffer.concat([PKCS8_PREFIX, Buffer.from(seed)]),
        format: "der",
        type: "pkcs8",
    });
    const jwk = crypto.createPublicKey(key).export({ format: "jwk" });
    return Buffer.from(jwk.x, "base64url");
}

module.exports = { selectBackend, fromSeed };
