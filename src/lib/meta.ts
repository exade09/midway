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

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/**
 * On-chain metadata for tokens the markets know nothing about — usually the dead ones, which is most of what we show.
 * Uses Helius DAS (`getAssetBatch`); on an RPC without DAS it quietly returns nothing.
 * Prefers Helius' CDN copy of the image: the original often sits on a slow IPFS gateway.
 */
export async function onchainMeta(mints: string[]): Promise<Map<string, { icon?: string; symbol?: string; name?: string }>> {
  const out = new Map<string, { icon?: string; symbol?: string; name?: string }>();
  const batches = await Promise.all(
    chunk([...new Set(mints)], 1000).map((ids) => rpc<Asset[]>("getAssetBatch", { ids }).catch(() => [] as Asset[])),
  );
  for (const batch of batches)
    for (const a of batch ?? []) {
      if (!a?.id) continue;
      const file = a.content?.files?.find((f) => !f.mime || f.mime.startsWith("image/"));
      const icon = file?.cdn_uri || a.content?.links?.image || file?.uri;
      const symbol = a.content?.metadata?.symbol?.trim() || undefined;
      const name = a.content?.metadata?.name?.trim() || undefined;
      if (icon || symbol || name) out.set(a.id, { icon, symbol, name });
    }
  return out;
}

/** Fills the gaps a market left: the icon always, the symbol and name only when the market didn't know the token at all. */
export function withMeta(m: TokenMarket, meta?: { icon?: string; symbol?: string; name?: string }): TokenMarket {
  if (!meta) return m;
  const unknown = m.source === "none";
  return {
    ...m,
    icon: m.icon || meta.icon,
    symbol: unknown && meta.symbol ? meta.symbol : m.symbol,
    name: unknown && meta.name ? meta.name : m.name,
  };
}
