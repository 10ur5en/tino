// App runs on testnet (Aptos + Shelby testnet)
export const APTOS_NETWORK = (import.meta.env.VITE_APTOS_NETWORK ?? "testnet") as "testnet" | "mainnet";
export const APTOS_API_KEY = import.meta.env.VITE_APTOS_API_KEY ?? "";
export const SHELBY_API_KEY = import.meta.env.VITE_SHELBY_API_KEY ?? "";
export const TINO_FEED_OWNER = import.meta.env.VITE_TINO_FEED_OWNER ?? "";
export const TINO_MODULE_ADDRESS = import.meta.env.VITE_TINO_MODULE_ADDRESS ?? TINO_FEED_OWNER;

export const SHELBY_EXPLORER_BASE = "https://explorer.shelby.xyz/testnet";
export const APTOS_EXPLORER_BASE = "https://explorer.aptoslabs.com";

export function shelbyBlobUrl(ownerAddress: string, blobName: string): string {
  return `${SHELBY_EXPLORER_BASE}/blobs/${encodeURIComponent(ownerAddress)}?blobName=${encodeURIComponent(blobName)}`;
}

export function aptosAccountUrl(address: string): string {
  return `${APTOS_EXPLORER_BASE}/account/${encodeURIComponent(address)}?network=${APTOS_NETWORK}`;
}

export function aptosTransactionUrl(txHash: string): string {
  return `${APTOS_EXPLORER_BASE}/txn/${txHash}?network=${APTOS_NETWORK}`;
}
