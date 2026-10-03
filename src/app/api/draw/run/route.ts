import type { NextRequest } from "next/server";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getStore } from "@/lib/store";
import { closesAt, epochOf } from "@/lib/epoch";
import { seedBlock } from "@/lib/seed";
import { pickWinner } from "@/lib/draw";
import { rpcUrl } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Nightly cron. Closes the epoch that just ended, seeds it from a chain-fixed block, pays if a payout key is configured. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return new Response("Set CRON_SECRET first", { status: 503 });
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const store = getStore();
  const epoch = epochOf() - 1;
  const existing = await store.getDraw(epoch);
  if (existing) return Response.json({ already: true, draw: existing });

  const [entrants, pot] = await Promise.all([store.entrants(epoch), store.potLamports(epoch)]);
  let block: { slot: number; blockhash: string };
  try {
    block = await seedBlock(closesAt(epoch));
  } catch (e) {
    return Response.json({ epoch, waiting: (e as Error).message }, { status: 425 });
  }
  const { slot } = block;
  const seed = `${block.blockhash}:${epoch}`;
  const winner = pickWinner(entrants, seed);
  const ticketsTotal = entrants.reduce((t, e) => t + e.tickets, 0);
  await store.saveDraw({ epoch, winner, potLamports: pot, ticketsTotal, seed, slot, paidSig: null, createdAt: new Date().toISOString() });

  let paidSig: string | null = null;
  const key = process.env.DRAW_PAYOUT_SECRET;
  if (winner && pot > 0 && key) {
    try {
      const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key) as number[]));
      const conn = new Connection(rpcUrl(), "confirmed");
      const bal = await conn.getBalance(payer.publicKey);
      const amount = Math.min(pot, bal - 5_000_000); // keep the pot wallet alive and fee-funded
      if (amount > 0) {
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(winner), lamports: amount }));
        paidSig = await sendAndConfirmTransaction(conn, tx, [payer]);
        await store.setPaid(epoch, paidSig);
      }
    } catch (e) {
      return Response.json({ epoch, winner, pot, seed, payoutError: (e as Error).message });
    }
  }
  return Response.json({ epoch, winner, pot, ticketsTotal, seed, slot, paidSig });
}
