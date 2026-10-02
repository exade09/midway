import type { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { closesAt, epochOf } from "@/lib/epoch";
import type { DrawState } from "@/lib/types";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const epoch = epochOf();
  if (req.nextUrl.searchParams.get("demo")) return Response.json(demo(epoch));
  const store = getStore();
  const [entrants, pot, last] = await Promise.all([store.entrants(epoch), store.potLamports(epoch), store.lastDraw()]);
  const state: DrawState = {
    epoch,
    closesAt: new Date(closesAt(epoch)).toISOString(),
    potLamports: pot,
    ticketsTotal: entrants.reduce((t, e) => t + e.tickets, 0),
    entrants: entrants.length,
    yourTickets: entrants.find((e) => e.owner === owner)?.tickets ?? 0,
    last: last && {
      epoch: last.epoch,
      winner: last.winner,
      potLamports: last.potLamports,
      ticketsTotal: last.ticketsTotal,
      seed: last.seed,
      paidSig: last.paidSig,
    },
  };
  return Response.json(state);
}

function demo(epoch: number): DrawState {
  return {
    epoch,
    closesAt: new Date(closesAt(epoch)).toISOString(),
    potLamports: 3_214_550_000,
    ticketsTotal: 1_284.6,
    entrants: 212,
    yourTickets: 0,
    last: { epoch: epoch - 1, winner: "7xKpQ2mFz9rBv4TnWcY8hLd3uAs6eJgN1oPqRtXyZ9fD", potLamports: 2_870_000_000, ticketsTotal: 1_102, seed: "demo", paidSig: null },
  };
}
