# Architecture

```
browser                                   server (Next.js route handlers)                 outside
───────                                   ───────────────────────────────                 ───────
Midway.tsx  ── GET /api/scan?owner ─────▶ scan.ts → classify.ts → deathwatch.ts ────────▶ Helius RPC
   │                                         └─ market.ts ───────────────────────────────▶ Jupiter v2 / DexScreener
   │        ── POST /api/barker ────────▶ barker.ts (templates) or Claude ──────────────▶ Anthropic API
   │
   ├ burn.ts builds txs (burnChecked + closeAccount + memo + pot cut)
   │        ── POST /api/rpc ───────────▶ relay, only MIDWAY-memo txs ──────────────────▶ Helius RPC
   │        ── POST /api/burn/record ───▶ verify.ts re-reads each tx from chain
   │                                         costbasis.ts (swap history) → tickets.ts
   │                                         store.ts (Neon, or /tmp JSON in dev)
   │
   ├ GET /api/draw, /api/graveyard, /api/rapsheet, /api/receipt
   │
cron 18:03 / 18:20 UTC ─ GET /api/draw/run ▶ seed.ts (first block ≥ close + 60 s) → draw.ts → payout
anyone ──────────────── GET /api/draw/proof?epoch=N  (seed, slot, entrants, winner)
```

## Trust boundaries

| The client says… | The server believes… |
|---|---|
| "I burned these" | Nothing until `verifyBurn` finds the tx on chain, signed by the owner, carrying the `MIDWAY` memo, closing accounts back to the owner, and paying the pot cut. |
| "This cost me $X" | Nothing. Loss comes from Helius swap history, server-side. |
| "Send this tx" | Only if it contains the `MIDWAY` memo — the relay won't spend our RPC on anything else. |

Signatures can be recorded once (`used_sigs` primary key). A burn whose block lands after a draw already ran counts toward the next night.

## Tickets

`tickets.ts` — zero for empty accounts, the owner's own launches (Jupiter `dev` = owner) and tokens with no market proof (< 50 holders and no ≥ 0.01 SOL buy). Otherwise `1 + min(2, log10(1 + loss/10))`. Capped at 25 per wallet per night in the store's `entrants()` query.

## Draw

1. Cron calls `/api/draw/run` after the close. It refuses in production without `CRON_SECRET`.
2. `seedBlock(close)` binary-searches slots by `getBlockTime` for the first produced block with time ≥ close + 60 s and reads its blockhash. Re-running the cron later finds the same block.
3. `pickWinner` — `sha256(blockhash:epoch) mod Σ round(tickets×100)`, walking entrants sorted by address.
4. With `DRAW_PAYOUT_SECRET`, the pot wallet pays the winner (keeping ~0.005 SOL for fees). Otherwise the draw is recorded and paid by hand.
5. Nights with no entrants roll their pot into the next one.

## Data model (Postgres)

| Table | Rows |
|---|---|
| `receipts` | one per recorded burial session: owner, epoch, sigs, reclaimed, pot cut, tickets, loss |
| `burials` | one per closed account: mint, symbol, rent, loss, tickets, epoch, deployer |
| `used_sigs` | every recorded signature (replay guard) |
| `draws` | one per night: winner, pot, tickets, seed, slot, payout sig |

Tables are created on first use. Without `DATABASE_URL` the same interface writes `/tmp/midway-store.json` — fine for local dev, not for Vercel.

## Front end

One page, five acts driven by `phase` in `Midway.tsx`: `lot → scan → ledger → ritual → receipt`.

- `Stage.tsx` + `Sphere.tsx` — the backdrop: the "Crepuscular sphere" raymarching shader (WebGL2, half resolution, paused when hidden). It turns faster while a wallet is read, floods with light at a burial and warms to amber on a grim reading. Camera moves per act.
- `BarkerPanel.tsx` — the Barker's portrait; his eyes (`Eyes.tsx`) follow the pointer and change with his mood.
- `Polish.tsx` — counting numbers, the rolling countdown, and the pointer light on panels.
- `sound.ts` — every sound is synthesised with Web Audio; starts on the first click, mute persists.
- `motion.ts` — easing tokens. Nothing bounces.
- `/docs` reuses the stage in its dimmed "receipt" camera as a backdrop.
- Everything respects `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` + CSS).
