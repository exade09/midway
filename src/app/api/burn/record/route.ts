import type { NextRequest } from "next/server";
import { isPubkey } from "@/lib/rpc";
import { verifyBurn } from "@/lib/verify";
import { markets, solUsd } from "@/lib/market";
import { costBasis } from "@/lib/costbasis";
import { ticketsFor } from "@/lib/tickets";
import { epochOf } from "@/lib/epoch";
import { getStore } from "@/lib/store";
import type { Burial } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { owner?: string; sigs?: string[] } | null;
  const owner = body?.owner;
  const sigs = [...new Set(body?.sigs ?? [])].filter((s) => /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(s));
  if (!isPubkey(owner) || sigs.length === 0 || sigs.length > 20) return Response.json({ error: "Bad request" }, { status: 400 });

  const store = getStore();
  const used = await store.sigsUsed(sigs);
  if (used.length) return Response.json({ error: "Already recorded" }, { status: 409 });

  // The chain is the only witness we trust. Give fresh signatures a moment to land.
  const verified = [];
  for (const sig of sigs) {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        verified.push(await verifyBurn(sig, owner));
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e as Error;
        if (!lastErr.message.includes("not found")) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (lastErr) return Response.json({ error: lastErr.message }, { status: 422 });
  }

  const closed = verified.flatMap((v) => v.closed.map((c) => ({ ...c, sig: v.sig, blockTime: v.blockTime })));
  const burnedMints = closed.filter((c) => c.burnedRaw !== "0").map((c) => c.mint);
  const [mk, basis, sol] = await Promise.all([markets(closed.map((c) => c.mint).filter(Boolean)), costBasis(owner, burnedMints), solUsd()]);

  // A burn that lands after tonight's draw already ran counts toward the next one.
  let epoch = epochOf(Math.max(...verified.map((v) => v.blockTime)) * 1000);
  if (await store.getDraw(epoch)) epoch = epochOf();

  const burials: Burial[] = closed.map((c) => {
    const m = mk.get(c.mint);
    const b = basis.get(c.mint);
    const lossUsd = b ? Math.max(0, b.netSol * (sol ?? 0) + b.netUsd) : null;
    return {
      sig: c.sig,
      owner,
      mint: c.mint,
      symbol: m?.symbol ?? c.mint.slice(0, 4) + "…",
      name: m?.name ?? "Unknown token",
      icon: m?.icon,
      rentLamports: c.rentLamports,
      lossUsd,
      tickets: ticketsFor({ burnedRaw: c.burnedRaw, owner, market: m, netSol: b?.netSol ?? null, lossUsd }),
      epoch,
      deployer: m?.dev ?? null,
      createdAt: new Date(c.blockTime * 1000).toISOString(),
    };
  });

  const lossKnown = burials.filter((b) => b.lossUsd != null);
  const receipt = await store
    .addReceipt({
    owner,
    epoch,
    sigs,
    reclaimedLamports: verified.reduce((t, v) => t + v.reclaimedLamports, 0),
    potLamports: verified.reduce((t, v) => t + v.potLamports, 0),
    tickets: burials.reduce((t, b) => t + b.tickets, 0),
    lossUsd: lossKnown.length ? lossKnown.reduce((t, b) => t + (b.lossUsd ?? 0), 0) : null,
    burials,
    createdAt: new Date().toISOString(),
    })
    .catch(() => null);
  if (!receipt) return Response.json({ error: "Already recorded" }, { status: 409 });
  return Response.json(receipt);
}
