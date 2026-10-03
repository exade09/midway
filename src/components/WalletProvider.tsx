"use client";
import { useCallback, useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import type { WalletError } from "@solana/wallet-adapter-base";
import { toast } from "@/lib/toast";

/**
 * Wallet Standard discovers Phantom, Solflare, Backpack & co. on its own — no adapter list to maintain.
 * The booth (`WalletPicker` in TopBar) always offers those three and never lists MetaMask.
 * The connection endpoint is our proxy; the adapter only needs it for its own bookkeeping.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => (typeof window === "undefined" ? "https://api.mainnet-beta.solana.com" : `${window.location.origin}/api/rpc`), []);
  const onError = useCallback((e: WalletError) => {
    const msg = e.message || e.name;
    // A closed popup is a choice, not a failure.
    if (/reject|cancel|closed|denied/i.test(msg)) toast("Wallet closed. Nothing was shared.");
    else toast(`Wallet: ${msg}`, "error", 5000);
  }, []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect onError={onError}>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
