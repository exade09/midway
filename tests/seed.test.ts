import { test } from "node:test";
import assert from "node:assert/strict";

// A fake chain: ~410ms slots with some skipped leaders.
const BASE = 1_700_000_000;
const timeOf = (s: number) => Math.floor(BASE + s * 0.41);
const skipped = (s: number) => s % 7 === 3 || s % 11 === 5;

test("seed block is the first finalized block ≥ close + 60s, whenever the cron runs", async () => {
  globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
    const { method, params } = JSON.parse(String(init?.body));
    const tip = Math.floor((Date.now() / 1000 - 13 - BASE) / 0.41);
    if (method === "getSlot") return new Response(JSON.stringify({ result: tip }));
    if (method === "getBlockTime") {
      const s = params[0] as number;
      if (skipped(s) || s > tip) return new Response(JSON.stringify({ error: { message: "skipped" } }));
      return new Response(JSON.stringify({ result: timeOf(s) }));
    }
    if (method === "getBlock") return new Response(JSON.stringify({ result: { blockhash: "hash" + params[0] } }));
    throw new Error(method);
  }) as typeof fetch;
  const { seedBlock } = await import("../src/lib/seed");
  const close = Date.now() - 3_600_000;
  const target = Math.floor(close / 1000) + 60;
  let first = Math.floor((target - BASE) / 0.41) - 5;
  while (skipped(first) || timeOf(first) < target) first++;
  const r = await seedBlock(close);
  assert.equal(r.slot, first);
  assert.equal(r.blockhash, "hash" + first);
  await assert.rejects(seedBlock(Date.now() - 30_000), /Too early/);
});
