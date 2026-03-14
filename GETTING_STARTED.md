# What to do next?

## 1. Run the app

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The `.env` file is in the project; the app runs in demo mode even without API keys.

---

## 2. Prepare your wallet (to post)

- Install **Petra**: https://petra.app/
- Set the wallet to **Aptos Testnet** (choose testnet in settings).
- Get **Testnet APT**: https://aptos.dev/network/faucet  
  (Needed for gas and Shelby registration when posting.)
- For **Shelby testnet token (ShelbyUSD)**: https://discord.gg/shelbyprotocol  
  (Needed to upload blobs; get access info on Discord.)

---

## 3. Try the site

1. **Connect wallet** – Use "Connect" on the page and select Petra.
2. **Post** – Type in the box and click "Post topic".  
   - First time you need both APT (gas) and ShelbyUSD.  
   - If no contract address is set, **demo mode**: posts go to Shelby, the list is kept in the browser (localStorage); likes/comments are not on-chain.
3. **Likes / comments** – To use these, you need to deploy the feed contract (see below).

---

## 4. (Optional) Deploy the contract for likes and comments

To store likes and comments on-chain:

```bash
cd move
aptos init
```

In `Move.toml`, in the `[addresses]` section, set `tino_feed` to your wallet address. Then:

```bash
aptos move compile --named-addresses tino_feed=default
aptos move publish --named-addresses tino_feed=default
```

Put the deployer account address in `.env`:

```
VITE_TINO_FEED_OWNER=0xYourDeployerAddress
VITE_TINO_MODULE_ADDRESS=0xYourDeployerAddress
```

Restart the app and refresh the page; likes and comments will be stored in the contract.

---

## 5. API keys (Shelby recommended – reduces "[Content could not be loaded]")

- **Shelby (recommended):** https://geomi.dev → sign in → **API Resource** → Network: **Testnet**, create a **client key** for frontend use. Paste the key next to `VITE_SHELBY_API_KEY=` in `.env`. Blob read/write is more stable and rate limits are higher.
- **Aptos:** https://developers.aptoslabs.com/docs/api-access  
  Paste the key next to `VITE_APTOS_API_KEY=` in `.env`.

---

**Summary:** For now, run `npm run dev`, open http://localhost:5173, connect your wallet and post in demo mode. You need testnet APT + ShelbyUSD (and optionally API keys) to post.
