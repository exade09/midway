import "server-only";
import { rpc } from "./rpc";
import type { TokenMarket } from "./types";

type Asset = {
  id: string;
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
    files?: { uri?: string; cdn_uri?: string; mime?: string }[];
  };
} | null;

type Meta = { cdn?: string; icon?: string; symbol?: string; name?: string };

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/**
 * On-chain metadata for tokens the markets know nothing about — usually the dead ones, which is most of what we show.
 * Uses Helius DAS (`getAssetBatch`); on an RPC without DAS it quietly returns nothing.
 * Prefers Helius' CDN copy of the image: the original often sits on a slow IPFS gateway.
 */
export async function onchainMeta(mints: string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  const batches = await Promise.all(
    chunk([...new Set(mints)], 1000).map((ids) => rpc<Asset[]>("getAssetBatch", { ids }).catch(() => [] as Asset[])),
  );
  for (const batch of batches)
    for (const a of batch ?? []) {
      if (!a?.id) continue;
      const file = a.content?.files?.find((f) => !f.mime || f.mime.startsWith("image/"));
      const cdn = file?.cdn_uri || undefined;
      const icon = a.content?.links?.image || file?.uri;
      const symbol = a.content?.metadata?.symbol?.trim() || undefined;
      const name = a.content?.metadata?.name?.trim() || undefined;
      if (cdn || icon || symbol || name) out.set(a.id, { cdn, icon, symbol, name });
    }
  return out;
}

/**
 * Fills the gaps a market left. The picture: Helius' CDN copy first (markets usually point at IPFS hosts that
 * rate-limit), then the market's, then the metadata's. Symbol and name only when the market didn't know the token.
 */
export function withMeta(m: TokenMarket, meta?: Meta): TokenMarket {
  if (!meta) return m;
  const unknown = m.source === "none";
  return {
    ...m,
    icon: meta.cdn || m.icon || meta.icon,
    symbol: unknown && meta.symbol ? meta.symbol : m.symbol,
    name: unknown && meta.name ? meta.name : m.name,
  };
}
