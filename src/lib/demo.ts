import type { Bag, ScanResult, TokenMarket } from "./types";
import { classify, isBurnable, type RawAccount } from "./classify";
import { TOKEN_PROGRAM } from "./config";

/** Deterministic fake base58 for the demo's token accounts (the mints are real, the wallet is not). */
function fakeKey(seed: string, suffix = "") {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let h = 2166136261;
  let out = "";
  for (let i = 0; out.length < 44 - suffix.length; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    out += A[h % 58];
  }
  return out + suffix;
}

export const DEMO_OWNER = "DeMo1111111111111111111111111111111111111111";

/**
 * The demo lot holds real Solana tokens: real mints, real names, their own logos (saved in public/demo,
 * because their IPFS hosts rate-limit), with made-up balances. Market facts are read live from Jupiter
 * when the demo is opened, so every status and Death Clock is the real one; `snap` is a snapshot used
 * when Jupiter can't be reached (and by the tests).
 */
type Spec = {
  mint: string;
  amount: number;
  snap: { symbol: string; name: string; decimals: number; price: number | null; liq: number | null; holders: number | null; launchpad?: string };
};

const SPECS: Spec[] = [
  // The dead: under $500 of liquidity on Jupiter and on DexScreener alike.
  { mint: "DcsjML99TfewNHnarcWX37drBZerR4jSzorzeSwLpump", amount: 4_812_330, snap: { symbol: "TRMPL", name: "Trumplet", decimals: 6, price: 0.0000025, liq: 291, holders: 262, launchpad: "pump.fun" } },
  { mint: "DpgWwZ8WKEg8moFwfRAsNEhL51qyJhomBAkuEg2Vpump", amount: 12_090_441, snap: { symbol: "GMTRUMP", name: "Good Morning Trump", decimals: 6, price: 0.0000023, liq: 143, holders: 213, launchpad: "pump.fun" } },
  { mint: "4YqbggbpvRKyZuQEXx8RNegF7nZ9pabRSw8uhz7Zpump", amount: 2_500_000, snap: { symbol: "BSI", name: "Baby Super Inu", decimals: 6, price: 0.0000027, liq: 274, holders: 63, launchpad: "pump.fun" } },
  { mint: "7Ec96FykXSLSEqHjbU5q7pzELdUgYN74PKFRJfgVAKF", amount: 880_120, snap: { symbol: "CAT2", name: "SOL CAT 2", decimals: 6, price: null, liq: null, holders: 129 } },
  { mint: "Ek2w8psUa86FZ18i5YiGEASdefAbkQXsPWMHFP28pump", amount: 9_999_999, snap: { symbol: "PEPE", name: "FIRST PEPE THE FROG", decimals: 6, price: null, liq: null, holders: 48, launchpad: "pump.fun" } },
  // Dust: a real, deep token, but only crumbs of it.
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", amount: 2_000, snap: { symbol: "Bonk", name: "Bonk", decimals: 5, price: 0.0000037, liq: 6_113_955, holders: 1_026_207 } },
  // Empty plots: the account is still open, the tokens long gone.
  { mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", amount: 0, snap: { symbol: "Fartcoin", name: "Fartcoin", decimals: 6, price: 0.17, liq: 6_670_813, holders: 192_321, launchpad: "pump.fun" } },
  { mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump", amount: 0, snap: { symbol: "Pnut", name: "Peanut the Squirrel", decimals: 6, price: 0.054, liq: 3_713_931, holders: 88_396, launchpad: "pump.fun" } },
  { mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", amount: 0, snap: { symbol: "GOAT", name: "Goatseus Maximus", decimals: 6, price: 0.018, liq: 1_817_021, holders: 88_031, launchpad: "pump.fun" } },
  // The living: the Deathwatch reads their real numbers.
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", amount: 120, snap: { symbol: "$WIF", name: "dogwifhat", decimals: 6, price: 0.25, liq: 7_212_606, holders: 264_754 } },
  { mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", amount: 400, snap: { symbol: "POPCAT", name: "Popcat", decimals: 9, price: 0.052, liq: 4_778_461, holders: 142_640 } },
  { mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", amount: 60_000, snap: { symbol: "MEW", name: "cat in a dogs world", decimals: 5, price: 0.00052, liq: 10_915_616, holders: 158_946 } },
  // Never touched.
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: 42.5, snap: { symbol: "USDC", name: "USD Coin", decimals: 6, price: 1, liq: 9e8, holders: 3e6 } },
  { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", amount: 310, snap: { symbol: "JUP", name: "Jupiter", decimals: 6, price: 0.61, liq: 4e7, holders: 9e5 } },
];

export const DEMO_MINTS = SPECS.map((s) => s.mint);

export function demoBags(live?: Map<string, TokenMarket>, owner = DEMO_OWNER): Bag[] {
  return SPECS.map((s, i) => {
    const { mint, snap } = s;
    const raw: RawAccount = {
      account: fakeKey(snap.symbol + i),
      mint,
      program: TOKEN_PROGRAM,
      amountRaw: s.amount ? String(Math.round(s.amount * 10 ** snap.decimals)) : "0",
      decimals: snap.decimals,
      uiAmount: s.amount,
      rentLamports: 2_039_280,
      state: "initialized",
      withheld: false,
    };
    const fallback: TokenMarket = {
      mint,
      symbol: snap.symbol,
      name: snap.name,
      decimals: snap.decimals,
      priceUsd: snap.price,
      liquidityUsd: snap.liq,
      mcapUsd: null,
      holders: snap.holders,
      launchpad: snap.launchpad,
      source: "jupiter",
    };
    // Local copy of the token's own logo: its IPFS host turns busy pages away.
    const market = { ...(live?.get(mint) ?? fallback), icon: `/demo/${mint.slice(0, 8)}.webp` };
    return classify(raw, market, owner);
  });
}

export function demoScan(live?: Map<string, TokenMarket>, solUsd?: number | null): ScanResult {
  const bags = demoBags(live);
  const order = { RUGGED: 0, DUST: 1, EMPTY: 2, ALIVE: 3, FROZEN: 4, STUCK: 5, PROTECTED: 6 } as const;
  bags.sort((x, y) => order[x.status] - order[y.status] || (y.death?.score ?? 0) - (x.death?.score ?? 0));
  const burnable = bags.filter(isBurnable);
  return {
    owner: DEMO_OWNER,
    scannedAt: new Date().toISOString(),
    solUsd: solUsd ?? 182.4,
    bags,
    totals: {
      burnable: burnable.length,
      rentLamports: burnable.reduce((t, b) => t + b.rentLamports, 0),
      deathwatch: bags.filter((b) => b.status === "ALIVE").length,
    },
    demo: true,
  };
}
