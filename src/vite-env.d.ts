/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APTOS_NETWORK: "testnet" | "mainnet";
  readonly VITE_APTOS_API_KEY: string;
  readonly VITE_SHELBY_API_KEY: string;
  readonly VITE_TINO_FEED_OWNER: string; // Aptos address that holds FeedRegistry (deployer)
  readonly VITE_TINO_MODULE_ADDRESS: string; // Same as feed owner for published module
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
