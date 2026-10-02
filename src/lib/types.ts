export type BagStatus = "EMPTY" | "RUGGED" | "DUST" | "FROZEN" | "ALIVE" | "PROTECTED" | "STUCK";

export interface TokenMarket {
  mint: string;
  symbol: string;
  name: string;
  icon?: string;
  decimals?: number;
  priceUsd: number | null;
  liquidityUsd: number | null;
  mcapUsd: number | null;
  holders: number | null;
  dev?: string;
  launchpad?: string;
  createdAt?: string;
  verified?: boolean;
  organicScore?: number | null;
  audit?: {
    mintAuthorityDisabled?: boolean;
    freezeAuthorityDisabled?: boolean;
    topHoldersPercentage?: number;
    devBalancePercentage?: number;
    devMints?: number;
    devMigrations?: number;
  };
  stats1h?: WindowStats;
  stats6h?: WindowStats;
  stats24h?: WindowStats;
  source: "jupiter" | "dexscreener" | "none";
}

export interface WindowStats {
  priceChange?: number;
  holderChange?: number;
  liquidityChange?: number;
  volumeChange?: number;
  buyVolume?: number;
  sellVolume?: number;
  numBuys?: number;
  numSells?: number;
  numNetBuyers?: number;
}

export interface Bag {
  account: string;
  mint: string;
  program: string;
  amountRaw: string;
  decimals: number;
  uiAmount: number;
  rentLamports: number;
  state: "initialized" | "frozen";
  status: BagStatus;
  reason: string;
  valueUsd: number | null;
  market: TokenMarket;
  /** Only for ALIVE bags. */
  death?: DeathReading;
}

export interface Symptom {
  key: string;
  weight: number;
  text: string;
}

export interface DeathReading {
  score: number;
  verdict: "STABLE" | "SICKLY" | "TERMINAL" | "LAST RITES";
  symptoms: Symptom[];
  /** Days until the pool runs dry if the 24h liquidity bleed holds. Null when the pool isn't bleeding. */
  daysLeft: number | null;
}

export interface ScanResult {
  owner: string;
  scannedAt: string;
  solUsd: number | null;
  bags: Bag[];
  totals: {
    burnable: number;
    rentLamports: number;
    deathwatch: number;
  };
  demo?: boolean;
}

export interface Burial {
  sig: string;
  owner: string;
  mint: string;
  symbol: string;
  name: string;
  icon?: string;
  rentLamports: number;
  lossUsd: number | null;
  tickets: number;
  epoch: number;
  deployer?: string | null;
  createdAt: string;
}

export interface Receipt {
  id: number;
  owner: string;
  epoch: number;
  sigs: string[];
  reclaimedLamports: number;
  potLamports: number;
  tickets: number;
  lossUsd: number | null;
  burials: Burial[];
  createdAt: string;
}

export interface DrawState {
  epoch: number;
  closesAt: string;
  potLamports: number;
  ticketsTotal: number;
  entrants: number;
  yourTickets: number;
  last: null | {
    epoch: number;
    winner: string | null;
    potLamports: number;
    ticketsTotal: number;
    seed: string;
    paidSig: string | null;
  };
}

export interface RapSheet {
  deployer: string;
  launches: number | null;
  migrations: number | null;
  buried: number;
  mourners: number;
  lossUsd: number;
  recent: { mint: string; symbol: string; buriedAt: string }[];
  verdict: string;
}
