"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";

/**
 * Wallet Standard discovers Phantom, Solflare, Backpack & co. on its own — no adapter list to maintain.
 * The connection endpoint is our proxy; the adapter only needs it for its own bookkeeping.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => (typeof window === "undefined" ? "https://api.mainnet-beta.solana.com" : `${window.location.origin}/api/rpc`), []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
