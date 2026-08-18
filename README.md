<div align="center">

# 🚀 Solana Vanity Address Generator

**Generate a Solana wallet address that starts or ends with whatever you want.**

🔥 Created by [@daronthedragon](https://twitter.com/daronthedragon) 🔥

[![Node](https://img.shields.io/badge/Node-%E2%89%A516-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Runs locally](https://img.shields.io/badge/keys-never%20leave%20your%20machine-blueviolet)](#-security)
[![License](https://img.shields.io/badge/license-MIT-black)](#-license)

</div>

---

Every CPU core generates keypairs until one of them lands an address matching your pattern. No servers, no APIs — the search happens on your machine and the key never goes anywhere.

<p align="center">
  <img src="assets/demo.svg" width="720"
       alt="Terminal showing the generator running across 16 CPU cores, having scanned 700,000 addresses while searching for a prefix">
</p>

<sub>A real run, searching across 16 cores. The result screen is deliberately not shown — it prints a live private key.</sub>

---

## 📥 Install

```sh
git clone https://github.com/daronthedragon/solanavanitygenerator.git
```

```sh
cd solanavanitygenerator && npm install
```

```sh
node gen.js
```

Needs Node 16+. 📖 New to the terminal? The [install guide](INSTALL.md) walks through Windows and macOS step by step.

---

## 📝 How it works

**1. Pick `start` or `end`** — whether your pattern should be a prefix or a suffix.

**2. Enter your pattern.** Solana addresses are Base-58, so only these characters exist:

```
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

There is no `0`, no capital `O`, no capital `I`, and no lowercase `l`. The tool rejects them rather than searching forever for something impossible.

**3. Wait.** A live ticker shows batches processed, addresses scanned, and an estimate. Every core is working.

**4. Copy your keys.** When a match lands, the public key and the private key are printed, along with how long it took.

### ⏱ How long does it take?

Each extra character multiplies the search by 58. Rough orders of magnitude on a typical multi-core machine:

| Pattern length | Expected attempts | Ballpark |
| :--- | :--- | :--- |
| 3 characters | ~195,000 | seconds |
| 4 characters | ~11 million | a minute or two |
| 5 characters | ~656 million | hours |
| 6 characters | ~38 billion | days |

Case matters, so `SOL` and `sol` are different searches. Suffixes are the same cost as prefixes.

---

## 🔒 Security

**Everything happens locally.** Keys are generated on your machine with Node's cryptographic random source, and nothing is transmitted anywhere. There is no server, no API call, and no telemetry. You can read all of [`gen.js`](gen.js) in a few minutes — that is the point of it being open source.

Two things worth knowing anyway:

- **The private key is printed to your terminal.** That means it lands in your scroll-back, and in any recording or screen-share running at the time. Move it into your wallet, then clear the screen.
- **A vanity address is not a safer address.** It is a normal keypair that happened to match a pattern. Treat the key exactly as you would any other.

---

## 🐛 Fixed: keys that would not import

If you generated a wallet with an older version of this tool and your wallet app **rejected the private key**, that was a bug here, not something you did.

Base-58 encodes every leading zero byte as a literal `1`. The old encoder treated the key as one big number, which silently dropped those leading zeros and produced a shorter string that decodes back to the wrong bytes. Roughly **1 in 313** keys starts with a zero byte, so about that share of generated wallets exported a string no wallet could import.

This is fixed. Keys generated now encode correctly, verified against every key in a 20,000-keypair sample that starts with a zero byte.

Also fixed in the same pass: worker threads now shut down once a match is found, instead of pinning every core at 100% while the result sits on screen.

---

## ❓ FAQ

**Does this work on Windows, macOS and Linux?**
Yes, all three. See [INSTALL.md](INSTALL.md).

**Can I import the result into Phantom or Solflare?**
Yes. The private key is printed in the Base-58 format wallets expect.

**Can I make the search faster?**
It already uses every core. The only real lever is a shorter pattern — each character you drop makes it 58× quicker.

**Is a longer pattern more secure?**
No. Every address here has the same 256-bit keypair behind it. A longer pattern is purely cosmetic and costs more CPU.

---

## 🤝 Contributing

Issues and pull requests are welcome.

---

## 📜 License

MIT.

<div align="center">

⭐ **If you found this useful, consider starring the repo!** ⭐

</div>
