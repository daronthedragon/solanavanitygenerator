# 🚀 Solana Vanity Address Generator  

🔥 **Created by [@daronthedragon](https://twitter.com/daronthedragon) on Twitter** 🔥  

A **simple, open-source, and secure** vanity wallet generator for **Solana**. This tool allows users to generate **custom Solana wallet addresses** with specific prefixes or suffixes while ensuring **full security on their system**.  

---

## 🛠 Features  

✔️ **Multi-threaded processing** for ultra-fast address generation  
✔️ **Live progress updates** with batch tracking and estimated time to completion  
✔️ **Supports both prefixes and suffixes** for vanity address matching  
✔️ **Generates secure, local wallets without exposing private keys online**  
✔️ **Automatically prompts to generate another address or exit**  
✔️ **Outputs private keys in a format compatible with Phantom**  

---

## 📥 Installation  

### **1️⃣ Clone the Repository**  
```sh
git clone https://github.com/daronthedragon/solanavanitygenerator.git
cd solanavanitygenerator
```

### **2️⃣ Install Dependencies**  
```sh
npm install
```

### **3️⃣ Run the Program**  
```sh
node gen.js
```

---

## 📝 Usage  

### **1️⃣ Choose if you want a prefix or suffix**  
- Type **`start`** to generate addresses that **start** with a specific string  
- Type **`end`** to generate addresses that **end** with a specific string  

### **2️⃣ Enter Your Desired Pattern**  
- Example **(prefix):** `beet` → Will generate an address like `beetXyz1234...`  
- Example **(suffix):** `moon` → Will generate an address like `Xyz1234moon`  

### **3️⃣ Wait for the Address to Generate**  
- The program will continuously generate addresses until it **finds a match**  
- **Live ticker updates** show how many addresses have been scanned  
- **Estimated time** to completion is displayed  

### **4️⃣ Vanity Address Found! 🎉**  
Once a match is found, the program will display:  
- ✅ **Public Key** (Your Solana wallet address)  
- 🔑 **Private Key** (For import into Phantom & other wallets)  
- ⏱️ **Time Taken** (How long the process took)  

### **5️⃣ Choose to Generate Another or Exit**  
After an address is found, the program will ask:  
- **"Would you like to generate another vanity address? (yes/no)"**  
- Type **`yes`** to generate another  
- Type **`no`** to exit  

---

## 🔒 Security  

This tool is **100% secure** and runs **locally on your system**.  
✔️ **No external servers or APIs are used**  
✔️ **Private keys are never transmitted online**  
✔️ **Wallets are generated directly on your machine**  

---

## 📌 Example Output  

```sh
✅ Vanity address found! 🎉

📜 Public Key:  🔹 beetXyz123456789abcdefg
🔑 Private Key (Import into Phantom!): 🟢 5x9hP2vP...dDkQTxGzM1FZ

⏱️ Time Taken: 12.42 seconds
🔒 Store your private key securely!
```

---

## ❓ FAQ  

### **Can I use this on Windows, Mac, or Linux?**  
✅ Yes! This program works on **Windows**, **MacOS**, and **Linux**.  

### **How long does it take to generate a vanity address?**  
🔹 It depends on your CPU speed and the length of the pattern you're searching for.  
🔹 Shorter patterns (e.g., 3-4 characters) take seconds to minutes.  
🔹 Longer patterns (e.g., 6+ characters) take significantly longer.  

### **Is this secure?**  
✅ **Yes!** The program runs entirely on your system, and private keys **never** leave your computer.  

### **Can I use this wallet with Phantom, Solflare, or other wallets?**  
✅ Yes! The generated **private key** can be imported into **Phantom**, **Solflare**, or any other Solana-compatible wallet.

---

## 🤝 Contributing  

Contributions are **welcome**! If you have suggestions for improvements, feel free to:  
- Open an **issue**  
- Submit a **pull request**  

---

## 📜 License  

This project is **open-source** and licensed under the **MIT License**.  

---

### 🌟 **If you found this useful, consider starring the repo on GitHub!** ⭐  
