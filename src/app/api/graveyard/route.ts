import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import type { Burial } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("demo")) return Response.json({ recent: demoFeed() });
  const recent = await getStore().recentBurials(30);
  return Response.json({ recent });
}

function demoFeed(): Burial[] {
  const rows: [string, string, number][] = [
    ["HOPIUM", "9fQ2…aZk1", 412], ["COPECAT", "3mTx…w8Lp", 88], ["LAMBOS", "Bv7r…2nQe", 1_240],
    ["RUGRAT", "Hk2P…9sYd", 63], ["MOONPIG", "6pWn…tR4c", 230], ["DEADBEEF", "Zc1q…Fm7a", 19],
    ["FROGGO", "Qa8e…Lx3v", 507], ["GRAVY", "Ty6u…pK0s", 0], ["NOODLE", "Mn4b…Ue2h", 76],
  ];
  return rows.map(([symbol, owner, loss], i) => ({
    sig: "demo" + i, owner, mint: "demo" + symbol, symbol, name: symbol, rentLamports: 2_039_280,
    lossUsd: loss || null, tickets: loss ? 1 : 0, epoch: 0, deployer: null,
    createdAt: new Date(Date.now() - i * 431_000).toISOString(),
  }));
}
