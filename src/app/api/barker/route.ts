import { BARKER_SYSTEM, bagSpeech, scanSpeech } from "@/lib/barker";
import type { Bag, ScanResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { kind: "scan"; scan: ScanResult } | { kind: "bag"; bag: Bag };

/**
 * Streams the barker's line. OpenAI writes it when OPENAI_API_KEY is set, Claude when ANTHROPIC_API_KEY is;
 * otherwise a templated line is streamed the same way.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || (body.kind !== "scan" && body.kind !== "bag")) return new Response("Bad request", { status: 400 });
  const fallback = body.kind === "scan" ? scanSpeech(body.scan) : bagSpeech(body.bag);

  const facts = body.kind === "scan" ? factsForScan(body.scan) : factsForBag(body.bag);
  const prompt = `Facts:
${JSON.stringify(facts)}

A draft you may improve on, keeping every fact:
${fallback}`;

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    const model = process.env.OPENAI_MODEL || "gpt-5.6";
    // Reasoning models think before they speak: a little thinking keeps him on the facts, and the budget covers both.
    const reasoning = /^(gpt-5|o\d)/.test(model);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${openai}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        ...(reasoning ? { reasoning_effort: process.env.OPENAI_REASONING || "low", max_completion_tokens: 1200 } : { max_tokens: 220 }),
        stream: true,
        messages: [
          { role: "system", content: BARKER_SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    }).catch(() => null);
    if (res && !res.ok) console.warn("[midway] openai barker failed:", res.status, (await res.text()).slice(0, 200));
    if (res?.ok && res.body) return new Response(sseToText(res.body, openaiDelta), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
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
    if (res?.ok && res.body) return new Response(sseToText(res.body, anthropicDelta), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(drip(fallback), { headers: { "content-type": "text/plain; charset=utf-8" } });
}

/** SOL to four places, as the templates print it — the model copies whatever precision it is given. */
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

function factsForScan(s: ScanResult) {
  return {
    burnable: s.totals.burnable,
    rentSol: round4(s.totals.rentLamports / 1e9),
    byStatus: s.bags.reduce<Record<string, number>>((m, b) => ((m[b.status] = (m[b.status] ?? 0) + 1), m), {}),
    dying: s.bags.filter((b) => b.death && b.death.score >= 50).map((b) => ({ symbol: b.market.symbol, score: b.death!.score, verdict: b.death!.verdict, why: b.death!.symptoms.slice(0, 2).map((x) => x.text) })),
  };
}
function factsForBag(b: Bag) {
  return { symbol: b.market.symbol, status: b.status, reason: b.reason, valueUsd: b.valueUsd, rentSol: round4(b.rentLamports / 1e9), liquidityUsd: b.market.liquidityUsd, holders: b.market.holders, death: b.death };
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

type Delta = (ev: unknown) => string | undefined;
const anthropicDelta: Delta = (ev) => {
  const e = ev as { type: string; delta?: { type: string; text?: string } };
  return e.type === "content_block_delta" && e.delta?.type === "text_delta" ? e.delta.text : undefined;
};
const openaiDelta: Delta = (ev) => (ev as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content ?? undefined;

/** Turns a provider's SSE stream into plain text, picking each chunk's text with `delta`. */
function sseToText(body: ReadableStream<Uint8Array>, delta: Delta): ReadableStream<Uint8Array> {
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
            const text = delta(JSON.parse(l.slice(5)));
            if (text) c.enqueue(enc.encode(text));
          } catch {}
        }
      },
    }),
  );
}
