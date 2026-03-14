import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import type { PropsWithChildren } from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { APTOS_API_KEY } from "./config";

// Aptos testnet (Shelby also uses testnet)
const network = Network.TESTNET;

export function WalletProvider({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect
      dappConfig={{
        network,
        aptosApiKeys: APTOS_API_KEY ? { testnet: APTOS_API_KEY } : undefined,
      }}
      onError={(error) => {
        console.error("Wallet connection error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
