import type { Bag, BagStatus, TokenMarket } from "./types";
import { DEAD_LIQUIDITY_USD, DUST_USD, PROTECTED_MINTS } from "./config";
import { deathReading } from "./deathwatch";

export interface RawAccount {
  account: string;
  mint: string;
  program: string;
  amountRaw: string;
  decimals: number;
  uiAmount: number;
  rentLamports: number;
  state: "initialized" | "frozen";
  /** Token-2022 accounts holding withheld transfer fees can't be closed until harvested. */
  withheld: boolean;
}

export function classify(a: RawAccount, m: TokenMarket, owner: string): Bag {
  const value = m.priceUsd != null ? a.uiAmount * m.priceUsd : null;
  const liq = m.liquidityUsd;
  let status: BagStatus;
  let reason: string;

  if (PROTECTED_MINTS.has(a.mint)) {
    status = "PROTECTED";
    reason = "Blue-chip. The lot doesn't take these.";
  } else if (a.state === "frozen") {
    status = "FROZEN";
    reason = "The deployer froze this account. It can't be sold, burned or closed.";
  } else if (a.withheld) {
    status = "STUCK";
    reason = "Withheld transfer fees block closing.";
  } else if (a.amountRaw === "0") {
    status = "EMPTY";
    reason = "Empty account still holding your rent.";
  } else if (m.source === "none" || liq == null || liq < DEAD_LIQUIDITY_USD) {
    status = "RUGGED";
    reason = m.source === "none" ? "No market anywhere. It's gone." : `Pool drained to $${(liq ?? 0).toFixed(0)}.`;
  } else if (value != null && value < DUST_USD) {
    status = "DUST";
    reason = `Worth $${value.toFixed(value < 0.01 ? 4 : 2)}. Not worth the swap fee.`;
  } else {
    status = "ALIVE";
    reason = "Still breathing.";
  }

  const bag: Bag = { ...a, status, reason, valueUsd: value, market: m };
  if (status === "ALIVE") bag.death = deathReading(m, m.dev === owner);
  return bag;
}

export const BURNABLE: BagStatus[] = ["EMPTY", "RUGGED", "DUST"];
export const isBurnable = (b: Bag) => BURNABLE.includes(b.status);
