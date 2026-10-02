"use client";
import { WalletProvider } from "./WalletProvider";
import { Midway } from "./Midway";
import type { Receipt } from "@/lib/types";

export function App({ receipt = null }: { receipt?: Receipt | null }) {
  return (
    <WalletProvider>
      <Midway initialReceipt={receipt} />
    </WalletProvider>
  );
}
