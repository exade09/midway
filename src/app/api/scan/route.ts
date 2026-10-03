import type { NextRequest } from "next/server";
import { scanWallet } from "@/lib/scan";
import { DEMO_MINTS, demoScan } from "@/lib/demo";
import { markets, solUsd } from "@/lib/market";
import { isPubkey } from "@/lib/rpc";
import type { ScanResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// A short memory per wallet: rescans and double-clicks don't hit the RPC again.
const cache = new Map<string, { at: number; data: ScanResult }>();
const TTL = 15_000;

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const fresh = req.nextUrl.searchParams.has("fresh");
  if (owner === "demo") {
    // Real tokens, read live; if Jupiter is down the demo falls back to its snapshot.
    const [live, sol] = await Promise.all([markets(DEMO_MINTS).catch(() => undefined), solUsd().catch(() => null)]);
    return Response.json(demoScan(live, sol));
  }
  if (!isPubkey(owner)) return Response.json({ error: "Bad wallet address" }, { status: 400 });
  const hit = cache.get(owner);
  if (hit && !fresh && Date.now() - hit.at < TTL) return Response.json(hit.data);
  try {
    const data = await scanWallet(owner);
    cache.set(owner, { at: Date.now(), data });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
