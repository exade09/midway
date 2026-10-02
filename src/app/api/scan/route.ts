import type { NextRequest } from "next/server";
import { scanWallet } from "@/lib/scan";
import { demoScan } from "@/lib/demo";
import { isPubkey } from "@/lib/rpc";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  if (owner === "demo") return Response.json(demoScan());
  if (!isPubkey(owner)) return Response.json({ error: "Bad wallet address" }, { status: 400 });
  try {
    return Response.json(await scanWallet(owner));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
