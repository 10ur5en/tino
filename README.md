# Tino – Decentralized Social Media

Twitter-style posts, likes and comments using Shelby (blob storage) and Aptos (wallet + contract).

## Features

- **Aptos wallet** sign-in (Petra, etc.)
- **Post sharing**: Content is uploaded to Shelby as blobs
- **Likes and comments**: Stored on-chain when the contract is deployed
- **Demo mode**: If no contract address is set, only posts work (localStorage + Shelby)

**Network:** The app runs on **testnet**. Both Aptos and Shelby use **testnet** (Shelby testnet, not shelbynet).

## Requirements

- Node.js 18+
- Aptos wallet (e.g. [Petra](https://petra.app/)) – set to testnet
- Testnet APT + ShelbyUSD ([Aptos Faucet](https://aptos.dev/network/faucet), [Shelby Discord](https://discord.gg/shelbyprotocol))

## Setup

```bash
npm install
cp .env.example .env
# Edit .env (optional API keys and contract address)
npm run dev
```

Open `http://localhost:5173` in your browser. For a step-by-step guide, see [GETTING_STARTED.md](GETTING_STARTED.md).

## Environment Variables (.env)

| Variable | Description |
|----------|-------------|
| `VITE_APTOS_API_KEY` | Aptos testnet API key (optional) |
| `VITE_SHELBY_API_KEY` | Shelby API key (**recommended**: [geomi.dev](https://geomi.dev) → API Resource, Testnet, client key; more stable blob read/write) |
| `VITE_TINO_FEED_OWNER` | Account address that deployed the feed contract |
| `VITE_TINO_MODULE_ADDRESS` | Feed module address (usually same as feed owner) |

If contract addresses are not set, the app runs in **demo mode**: posts are stored on Shelby, the feed list is kept in the browser (localStorage); likes/comments are not on-chain.

## Deploying the Contract (Aptos Move)

To use all features (likes, public replies, delete), deploy the feed contract to Aptos Testnet.

### 1. Account with Aptos CLI (one-time)

```bash
cd move
aptos init
```

- Choose network: **Testnet**.
- The CLI generates a new key or uses an existing wallet. The account that will deploy must have **testnet APT** and (if using Shelby) **ShelbyUSD**.
- Get testnet APT from [Aptos Faucet](https://aptos.dev/network/faucet).

### 2. Compile

```bash
npm run move:compile
```

or:

```bash
cd move
aptos move compile --named-addresses tino_feed=default
```

### 3. Publish (Testnet)

```bash
cd move
aptos move publish --named-addresses tino_feed=default --profile default
```

Or from project root:

```bash
npm run move:publish
```

- Approve the transaction in your wallet.
- The module is published at the **default** profile account address.

### 4. Update .env

Get the deployer account address:

```bash
cd move
aptos config show-profiles
```

Copy the `account` value for the `default` profile into the project root `.env`:

```
VITE_TINO_FEED_OWNER=0x...
VITE_TINO_MODULE_ADDRESS=0x...
```

(Both are the same address: the deployer account.)

Restart the app (`npm run dev`). Likes and replies will now work on-chain.

## Project Structure

- `src/` – React app (wallet, feed, post/comment/like)
- `move/` – Aptos Move feed contract (registration, likes, comment references)
- Post and comment **content** is stored as blobs on Shelby; **references** (who, which blob, when) are stored in the Aptos contract

## References

- [Shelby Docs](https://docs.shelby.xyz/protocol)
- [Shelby TypeScript SDK](https://docs.shelby.xyz/sdks/typescript)
- [Aptos Wallet Adapter](https://aptos.dev/build/sdks/wallet-adapter/dapp)
