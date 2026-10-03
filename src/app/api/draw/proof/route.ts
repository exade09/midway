import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { epochOf } from "@/lib/epoch";

/** Everything needed to re-run a past draw by hand: entrants, tickets, seed, winner. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("epoch");
  const epoch = raw ? Number(raw) : epochOf() - 1;
  if (!Number.isInteger(epoch)) return Response.json({ error: "Bad epoch" }, { status: 400 });
  const store = getStore();
  const draw = await store.getDraw(epoch);
  if (!draw) return Response.json({ error: "That night hasn't been drawn yet" }, { status: 404 });
  const entrants = await store.entrants(epoch);
  return Response.json({
    epoch,
    seed: draw.seed,
    slot: draw.slot,
    potLamports: draw.potLamports,
    winner: draw.winner,
    paidSig: draw.paidSig,
    algorithm: "roll = sha256(seed) mod Σ round(tickets×100); walk entrants sorted by address; first running sum > roll wins",
    entrants: entrants.sort((a, b) => a.owner.localeCompare(b.owner)),
  });
}
