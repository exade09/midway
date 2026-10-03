import type { NextRequest } from "next/server";
import { isPubkey } from "@/lib/rpc";
import { markets } from "@/lib/market";
import { getStore } from "@/lib/store";
import type { RapSheet } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 20;

/** Deployer rap sheet. Accepts a token mint (we resolve its deployer) or a deployer wallet. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!isPubkey(q)) return Response.json({ error: "Paste a token address or a deployer wallet" }, { status: 400 });

  const m = (await markets([q])).get(q);
  const deployer = m?.dev ?? q;
  const burials = await getStore().burialsByDeployer(deployer);
  const launches = m?.audit?.devMints ?? null;
  const migrations = m?.audit?.devMigrations ?? null;
  const mints = new Set(burials.map((b) => b.mint));
  const mourners = new Set(burials.map((b) => b.owner)).size;
  const lossUsd = burials.reduce((t, b) => t + (b.lossUsd ?? 0), 0);

  const lines: string[] = [];
  if (launches != null && launches >= 10) {
    const rate = migrations != null && launches > 0 ? migrations / launches : null;
    lines.push(
      rate != null && rate < 0.05
        ? `Serial launcher: ${launches} tokens, ${migrations} ever graduated.`
        : `${launches} launches on record.`,
    );
  }
  if (mints.size) lines.push(`Midway has buried ${mints.size} of their tokens for ${mourners} mourner${mourners === 1 ? "" : "s"}.`);
  if (!lines.length) lines.push(m ? "Clean sheet — so far. The lot remembers everything." : "No record. Nothing buried, nothing launched that we know of.");

  const sheet: RapSheet = {
    deployer,
    launches,
    migrations,
    buried: mints.size,
    mourners,
    lossUsd,
    recent: burials.slice(0, 6).map((b) => ({ mint: b.mint, symbol: b.symbol, buriedAt: b.createdAt })),
    verdict: lines.join(" "),
  };
  return Response.json({ sheet, token: m ? { symbol: m.symbol, name: m.name, icon: m.icon } : null });
}
