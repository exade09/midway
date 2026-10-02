import type { Bag, ScanResult, TokenMarket, WindowStats } from "./types";
import { classify, isBurnable, type RawAccount } from "./classify";
import { TOKEN_PROGRAM } from "./config";

/** Deterministic fake base58 so demo mints look real but can never collide with a live token. */
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

type Spec = {
  sym: string;
  name: string;
  amount: number;
  price?: number;
  liq?: number;
  holders?: number;
  s24?: WindowStats;
  s6?: WindowStats;
  audit?: TokenMarket["audit"];
  organic?: number;
  state?: "frozen";
  none?: boolean;
  protectedMint?: string;
  empty?: boolean;
};

const SPECS: Spec[] = [
  // The dead.
  { sym: "HOPIUM", name: "Hopium Finance", amount: 4_812_330, none: true },
  { sym: "COPECAT", name: "Cope Cat", amount: 12_090_441, price: 0.0000004, liq: 61, holders: 211 },
  { sym: "MOONPIG", name: "Moon Pig", amount: 880_120, price: 0.0000019, liq: 140, holders: 96 },
  { sym: "RUGRAT", name: "Rug Rat", amount: 2_500_000, none: true },
  { sym: "LAMBOS", name: "Lambos For All", amount: 31_500, price: 0.00071, liq: 302, holders: 418 },
  { sym: "DEADBEEF", name: "Dead Beef", amount: 9_999_999, none: true },
  { sym: "FROGGO", name: "Froggo", amount: 120_400, price: 0.0000061, liq: 2_900, holders: 1_204 },
  { sym: "NOODLE", name: "Wet Noodle", amount: 64_200, price: 0.0000088, liq: 7_100, holders: 2_018 },
  { sym: "GRAVY", name: "Gravy Train", amount: 0, empty: true },
  { sym: "SNEK", name: "Snek", amount: 0, empty: true },
  { sym: "PUMPKINZ", name: "Pumpkinz", amount: 0, empty: true },
  { sym: "AIRDROP", name: "Claim reward at …", amount: 1_000, none: true },
  { sym: "HONEY", name: "Honeypot Inu", amount: 777_000, price: 0.00002, liq: 18_000, holders: 640, state: "frozen" },
  // The living — fed to the Deathwatch.
  {
    sym: "GIGACHAD", name: "Giga Chad Coin", amount: 410_000, price: 0.00094, liq: 3_400, holders: 3_120,
    s24: { priceChange: -71, liquidityChange: -64, holderChange: -18, volumeChange: -82 },
    s6: { priceChange: -38, liquidityChange: -41, buyVolume: 1_200, sellVolume: 4_900, numNetBuyers: -44 },
    audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true, topHoldersPercentage: 63, devBalancePercentage: 9.2, devMints: 41 },
    organic: 11,
  },
  {
    sym: "BLOBBY", name: "Blobby", amount: 1_920_000, price: 0.000052, liq: 14_800, holders: 2_655,
    s24: { priceChange: -44, liquidityChange: -36, holderChange: -7, volumeChange: -58 },
    s6: { priceChange: -22, liquidityChange: -12, buyVolume: 3_100, sellVolume: 5_600, numNetBuyers: -9 },
    audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: false, topHoldersPercentage: 47, devBalancePercentage: 2.1, devMints: 3 },
    organic: 34,
  },
  {
    sym: "SPOOK", name: "Spook Season", amount: 88_000, price: 0.0061, liq: 92_000, holders: 8_870,
    s24: { priceChange: -18, liquidityChange: -9, holderChange: -2, volumeChange: -31 },
    s6: { priceChange: -6, liquidityChange: -3, buyVolume: 21_000, sellVolume: 34_500, numNetBuyers: 12 },
    audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true, topHoldersPercentage: 44, devBalancePercentage: 0.4, devMints: 2 },
    organic: 18,
  },
  {
    sym: "TENT", name: "Big Top", amount: 15_400, price: 0.112, liq: 1_480_000, holders: 41_200,
    s24: { priceChange: 6, liquidityChange: 2, holderChange: 1, volumeChange: 14 },
    s6: { priceChange: 1, liquidityChange: 0, buyVolume: 410_000, sellVolume: 398_000, numNetBuyers: 230 },
    audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true, topHoldersPercentage: 18, devBalancePercentage: 0, devMints: 1 },
    organic: 88,
  },
  // Never touched.
  { sym: "USDC", name: "USD Coin", amount: 42.5, price: 1, liq: 9e8, holders: 3e6, protectedMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { sym: "JUP", name: "Jupiter", amount: 310, price: 0.61, liq: 4e7, holders: 9e5, protectedMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
];

export function demoBags(owner = DEMO_OWNER): Bag[] {
  return SPECS.map((s, i) => {
    const mint = s.protectedMint ?? fakeKey(s.sym, "dead");
    const decimals = 6;
    const raw: RawAccount = {
      account: fakeKey(s.sym + i),
      mint,
      program: TOKEN_PROGRAM,
      amountRaw: s.empty ? "0" : String(Math.round(s.amount * 10 ** decimals)),
      decimals,
      uiAmount: s.amount,
      rentLamports: 2_039_280,
      state: s.state ?? "initialized",
      withheld: false,
    };
    const market: TokenMarket = s.none
      ? { mint, symbol: s.sym, name: s.name, priceUsd: null, liquidityUsd: null, mcapUsd: null, holders: null, source: "none" }
      : {
          mint,
          symbol: s.sym,
          name: s.name,
          decimals,
          priceUsd: s.price ?? null,
          liquidityUsd: s.liq ?? null,
          mcapUsd: s.price ? s.price * 1e9 : null,
          holders: s.holders ?? null,
          organicScore: s.organic ?? null,
          audit: s.audit,
          stats24h: s.s24,
          stats6h: s.s6,
          dev: fakeKey(s.sym + "dev"),
          launchpad: "pump.fun",
          source: "jupiter",
        };
    return classify(raw, market, owner);
  });
}

export function demoScan(): ScanResult {
  const bags = demoBags();
  const order = { RUGGED: 0, DUST: 1, EMPTY: 2, ALIVE: 3, FROZEN: 4, STUCK: 5, PROTECTED: 6 } as const;
  bags.sort((x, y) => order[x.status] - order[y.status] || (y.death?.score ?? 0) - (x.death?.score ?? 0));
  const burnable = bags.filter(isBurnable);
  return {
    owner: DEMO_OWNER,
    scannedAt: new Date().toISOString(),
    solUsd: 182.4,
    bags,
    totals: {
      burnable: burnable.length,
      rentLamports: burnable.reduce((t, b) => t + b.rentLamports, 0),
      deathwatch: bags.filter((b) => b.status === "ALIVE").length,
    },
    demo: true,
  };
}
