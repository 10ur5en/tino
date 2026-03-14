import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WalletProvider } from "./WalletProvider";
import App from "./App";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>
);
