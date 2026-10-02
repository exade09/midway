import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Bad id" }, { status: 400 });
  const r = await getStore().getReceipt(id);
  return r ? Response.json(r) : Response.json({ error: "Not found" }, { status: 404 });
}
