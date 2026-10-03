import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketsFor } from "../src/lib/tickets";
import { deathReading } from "../src/lib/deathwatch";
import { classify, isBurnable, type RawAccount } from "../src/lib/classify";
import { demoBags } from "../src/lib/demo";
import type { TokenMarket } from "../src/lib/types";

const market = (m: Partial<TokenMarket>): TokenMarket => ({ mint: "M", symbol: "X", name: "X", priceUsd: 1, liquidityUsd: 1e6, mcapUsd: 1, holders: 1000, source: "jupiter", ...m });

test("tickets: rent-only and farmed burials earn nothing", () => {
  assert.equal(ticketsFor({ burnedRaw: "0", owner: "a", market: market({}), netSol: 5, lossUsd: 900 }), 0);
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: market({ dev: "a" }), netSol: 5, lossUsd: 900 }), 0);
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: market({ holders: 12 }), netSol: 0.001, lossUsd: null }), 0);
});

test("tickets: real losses weigh in on a log scale and cap at 3", () => {
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: market({}), netSol: null, lossUsd: null }), 1);
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: market({}), netSol: 0.5, lossUsd: 100 }), 2.04);
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: market({}), netSol: 99, lossUsd: 1e6 }), 3);
  // A delisted token still counts if the wallet really bought it.
  assert.equal(ticketsFor({ burnedRaw: "9", owner: "a", market: undefined, netSol: 0.2, lossUsd: null }), 1);
});

test("death clock: a healthy token reads 0, a dying one reads last rites", () => {
  assert.equal(deathReading(market({})).score, 0);
  const dying = deathReading(
    market({
      liquidityUsd: 800,
      stats24h: { liquidityChange: -70, priceChange: -80, holderChange: -20, volumeChange: -90 },
      audit: { mintAuthorityDisabled: false, topHoldersPercentage: 70 },
    }),
  );
  assert.equal(dying.score, 100);
  assert.equal(dying.verdict, "LAST RITES");
  assert.ok(dying.daysLeft != null && dying.daysLeft > 0);
  assert.ok(dying.symptoms[0].weight >= dying.symptoms.at(-1)!.weight, "symptoms sorted by weight");
});

test("classify: protected and frozen bags are never buryable; NFTs never appear", () => {
  const raw = (over: Partial<RawAccount>): RawAccount => ({ account: "A", mint: "M", program: "P", amountRaw: "5", decimals: 6, uiAmount: 5, rentLamports: 2_039_280, state: "initialized", withheld: false, ...over });
  assert.equal(classify(raw({ mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }), market({}), "o").status, "PROTECTED");
  assert.equal(classify(raw({ state: "frozen" }), market({ liquidityUsd: 10 }), "o").status, "FROZEN");
  assert.equal(classify(raw({ amountRaw: "0" }), market({}), "o").status, "EMPTY");
  assert.equal(classify(raw({}), market({ source: "none", liquidityUsd: null }), "o").status, "RUGGED");
  assert.equal(classify(raw({ uiAmount: 0.1 }), market({ priceUsd: 1 }), "o").status, "DUST");
  const bags = demoBags();
  assert.ok(bags.filter(isBurnable).every((b) => !["PROTECTED", "FROZEN", "STUCK", "ALIVE"].includes(b.status)));
});
