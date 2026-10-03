"use client";
import { MotionConfig } from "motion/react";
import { WalletProvider } from "./WalletProvider";
import { PanelGlow } from "./Polish";
import { Midway } from "./Midway";
import type { Receipt } from "@/lib/types";

export function App({ receipt = null }: { receipt?: Receipt | null }) {
  return (
    <MotionConfig reducedMotion="user">
      <WalletProvider>
        <PanelGlow />
        <Midway initialReceipt={receipt} />
      </WalletProvider>
    </MotionConfig>
  );
}
