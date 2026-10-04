import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import type { GraveyardData } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("demo")) return Response.json(demo());
  const store = getStore();
  const [recent, deployers, stats] = await Promise.all([store.recentBurials(40), store.topDeployers(12), store.stats()]);
  return Response.json({ recent, deployers, stats } satisfies GraveyardData);
}

function demo(): GraveyardData {
  // The demo lot's dead tokens are real (see lib/demo); the mourners and their losses are made up.
  const rows: [string, string, number][] = [
    ["TRMPL", "9fQ2…aZk1", 412], ["GMTRUMP", "3mTx…w8Lp", 88], ["BSI", "Bv7r…2nQe", 1_240],
    ["CAT2", "Hk2P…9sYd", 63], ["PEPE", "6pWn…tR4c", 230], ["TRMPL", "Zc1q…Fm7a", 19],
    ["Fartcoin", "Ty6u…pK0s", 0], ["GMTRUMP", "Qa8e…Lx3v", 507], ["BSI", "Mn4b…Ue2h", 76],
    ["PEPE", "Rr3k…Vb9n", 2_310], ["CAT2", "Lp0w…Ae5t", 145], ["GOAT", "Wq7c…Jh2m", 0],
  ];
  const recent = rows.map(([symbol, owner, loss], i) => ({
    sig: "demo" + i, owner, mint: "demo" + symbol, symbol, name: symbol, rentLamports: 2_039_280,
    lossUsd: loss || null, tickets: loss ? 1 : 0, epoch: 0, deployer: null,
    createdAt: new Date(Date.now() - i * 431_000).toISOString(),
  }));
  const deployers = [
    ["7Gx9pQm2…Kd4s", 41, 212, 38_400], ["Fk2Lw8Tz…9aQe", 27, 160, 21_950], ["Bq4Rt1Vn…Mx0p", 19, 98, 9_300],
    ["Ue6Hs3Jk…2wLc", 14, 77, 12_120], ["Nn8Yp5Ca…Rt7d", 9, 51, 4_480], ["Ws1Ke9Db…Ph3x", 6, 33, 2_210],
  ].map(([deployer, buried, mourners, lossUsd]) => ({ deployer: deployer as string, buried: buried as number, mourners: mourners as number, lossUsd: lossUsd as number }));
  return { recent, deployers, stats: { graves: 4_812, mourners: 1_377, rentLamports: 9_812_000_000, lossUsd: 612_400 } };
}
