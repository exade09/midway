import { BARKER_SYSTEM, bagSpeech, scanSpeech } from "@/lib/barker";
import type { Bag, ScanResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { kind: "scan"; scan: ScanResult } | { kind: "bag"; bag: Bag };

/** Streams the barker's line. Claude writes it when a key is configured; otherwise a templated line is streamed the same way. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || (body.kind !== "scan" && body.kind !== "bag")) return new Response("Bad request", { status: 400 });
  const fallback = body.kind === "scan" ? scanSpeech(body.scan) : bagSpeech(body.bag);

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    const facts = body.kind === "scan" ? factsForScan(body.scan) : factsForBag(body.bag);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.BARKER_MODEL ?? "claude-haiku-4-5",
        max_tokens: 220,
        stream: true,
        system: BARKER_SYSTEM,
        messages: [{ role: "user", content: `Facts:\n${JSON.stringify(facts)}\n\nA draft you may improve on, keeping every fact:\n${fallback}` }],
      }),
    }).catch(() => null);
    if (res?.ok && res.body) return new Response(sseToText(res.body), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(drip(fallback), { headers: { "content-type": "text/plain; charset=utf-8" } });
}

function factsForScan(s: ScanResult) {
  return {
    burnable: s.totals.burnable,
    rentSol: s.totals.rentLamports / 1e9,
    byStatus: s.bags.reduce<Record<string, number>>((m, b) => ((m[b.status] = (m[b.status] ?? 0) + 1), m), {}),
    dying: s.bags.filter((b) => b.death && b.death.score >= 50).map((b) => ({ symbol: b.market.symbol, score: b.death!.score, verdict: b.death!.verdict, why: b.death!.symptoms.slice(0, 2).map((x) => x.text) })),
  };
}
function factsForBag(b: Bag) {
  return { symbol: b.market.symbol, status: b.status, reason: b.reason, valueUsd: b.valueUsd, rentSol: b.rentLamports / 1e9, liquidityUsd: b.market.liquidityUsd, holders: b.market.holders, death: b.death };
}

/** Emits a canned line word by word so the UI types it the same way it types a live model stream. */
function drip(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const words = text.split(/(?<=\s)/);
  return new ReadableStream({
    async start(c) {
      for (const w of words) {
        c.enqueue(enc.encode(w));
        await new Promise((r) => setTimeout(r, 18));
      }
      c.close();
    },
  });
}

function sseToText(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, c) {
        buf += dec.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(l.slice(5)) as { type: string; delta?: { type: string; text?: string } };
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) c.enqueue(enc.encode(ev.delta.text));
          } catch {}
        }
      },
    }),
  );
}
