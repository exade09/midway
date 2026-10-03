/** Central knobs. Server-only values never leave the server; NEXT_PUBLIC_* are safe for the client. */

export const LAMPORTS = 1_000_000_000;

/** Wallet that receives the pot cut and pays the nightly winner. */
export const POT_WALLET = process.env.NEXT_PUBLIC_POT_WALLET ?? "";

/** Share of reclaimed rent that goes into tonight's pot, in basis points (500 = 5%). */
export const POT_CUT_BPS = Number(process.env.NEXT_PUBLIC_POT_CUT_BPS ?? 500);

/** Hour (UTC) when the nightly draw closes. 18:00 UTC = 21:00 MSK. */
export const DRAW_HOUR_UTC = Number(process.env.NEXT_PUBLIC_DRAW_HOUR_UTC ?? 18);

/** Hard cap on tickets one wallet can hold for a single draw. */
export const TICKET_CAP = 25;

/** Below this USD value a token with a live market counts as dust. */
export const DUST_USD = 1;

/** A market thinner than this is treated as dead. */
export const DEAD_LIQUIDITY_USD = 500;

/** Memo stamped on every Midway burn so the server can recognise and verify it. */
export const MEMO_TAG = "MIDWAY";

export const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const WSOL = "So11111111111111111111111111111111111111112";

/** Never offered for burial, whatever their balance. */
export const PROTECTED_MINTS = new Set<string>([
  WSOL,
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", // PYUSD
  "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA", // USDS
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // JitoSOL
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", // bSOL
  "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", // jupSOL
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", // PUMP
]);

/** Public origin. Falls back to Vercel's production domain, then localhost. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
export const X_HANDLE = "midwaylot";
export const X_URL = "https://x.com/midwaylot";

/** The Midway token. Empty until launch — the header shows "soon" instead of an address. */
export const TOKEN_CA = (process.env.NEXT_PUBLIC_TOKEN_CA ?? "").trim();

/** Server-side RPC. Helius when a key is present, public mainnet otherwise. */
export function rpcUrl(): string {
  const key = process.env.HELIUS_API_KEY;
  return key ? `https://mainnet.helius-rpc.com/?api-key=${key}` : (process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com");
}

/** Client-side RPC used only to send/confirm signed transactions. Goes through our proxy so the key stays private. */
export const CLIENT_RPC_PATH = "/api/rpc";
