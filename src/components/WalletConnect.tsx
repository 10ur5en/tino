import { useState, useRef, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

function shortAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletConnect() {
  const { account, connect, disconnect, connected, wallets } = useWallet();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  if (connected && account) {
    return (
      <div className="wallet-connect wallet-connect--connected">
        <span className="wallet-connect__address" title={String(account.address)}>
          {shortAddress(String(account.address))}
        </span>
        <button type="button" onClick={() => disconnect()} className="wallet-connect__disconnect">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect" ref={panelRef}>
      <button
        type="button"
        className="wallet-connect__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="wallet-connect__trigger-icon">◇</span>
        Connect wallet
      </button>
      {open && (
        <div className="wallet-connect__dropdown">
          <p className="wallet-connect__dropdown-title">Choose a wallet</p>
          <ul className="wallet-connect__list">
            {wallets.map((wallet) => (
              <li key={wallet.name}>
                <button
                  type="button"
                  className="wallet-connect__option"
                  onClick={() => {
                    connect(wallet.name);
                    setOpen(false);
                  }}
                >
                  {wallet.icon && typeof wallet.icon === "string" && (
                    <img src={wallet.icon} alt="" className="wallet-connect__option-icon" />
                  )}
                  <span className="wallet-connect__option-name">{wallet.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
