# Midway — a carnival for dead bags

Bury rugged Solana tokens, take your SOL rent back, and every real loss is a ticket to the nightly draw.
The Barker (the rabbit) reads the bags you still hold and tells you which one is closest to zero.

One screen, five acts: **Gate → Reading → Ledger → Burial → Stub**.

## What it does

| Piece | How |
|---|---|
| **Scan** | `getTokenAccountsByOwner` for SPL + Token-2022 via Helius; markets from Jupiter Tokens v2, DexScreener as fallback. Held NFTs are skipped. |
| **Classify** | `RUGGED` (no market / pool < $500), `DUST` (< $1), `EMPTY` (0 balance) are buryable. `FROZEN`, `STUCK`, `PROTECTED` are never offered. |
| **Deathwatch** | `lib/deathwatch.ts` — a transparent 0–100 Death Clock from pool depth & bleed, price, holder exodus, sell pressure, volume collapse, top-holder share, live mint/freeze authority, dev bag, serial launcher, organic score. Every point maps to a named symptom. |
| **The Barker** | `/api/barker` streams his line. With `ANTHROPIC_API_KEY` Claude writes it from the facts; without, a templated line streams the same way. |
| **Burn** | Built client-side (`lib/burn.ts`): `burnChecked` + `closeAccount` per bag, ≤ 7 per tx, a `MIDWAY` memo, and the pot cut as a SOL transfer. User signs everything. |
| **Record** | `/api/burn/record` re-reads every signature from chain and only trusts what it proves (signer, memo, closes, pot cut). |
| **Tickets** | `lib/tickets.ts` — 0 for empty accounts and your own launches; the token must prove a real market (≥ 50 holders or a ≥ 0.01 SOL buy); loss adds weight on a log scale (max 3×); 25 per wallet per night. |
| **Draw** | Nightly at `DRAW_HOUR_UTC` (18:00 UTC = 21:00 MSK) by Vercel cron → `/api/draw/run`. Seed = hash of the first finalized block stamped ≥ 60 s after close (`lib/seed.ts`) — fixed by the chain, not by when the cron runs. `sha256(seed) mod tickets` over entrants sorted by address; `/api/draw/proof?epoch=N` publishes everything needed to re-run it. Pays automatically if `DRAW_PAYOUT_SECRET` is set. Empty nights roll over. |
| **Rap sheet** | `/api/rapsheet?q=` — paste a token or deployer: launches/migrations from Jupiter + everything of theirs buried on Midway. |
| **Graveyard** | Drawer on the main screen: fresh graves, lifetime totals and the Hall of shame (deployers ranked by mourners). |
| **Docs** | `/docs` — the public Rulebook. Death Clock weights are rendered from `DEATH_SIGNALS` so docs and code can't drift apart. |
| **Stub** | `/r/[id]` with a generated OG card so shared stubs unfurl on X. |

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit, trust boundaries, data model
- [docs/DEPLOY.ru.md](docs/DEPLOY.ru.md) — запуск на Vercel по шагам

## Run

```bash
cp .env.example .env.local   # fill HELIUS_API_KEY at minimum
npm install
npm run dev                  # http://localhost:3000  ·  /?demo=1 walks the demo lot
```

Without `DATABASE_URL` everything lands in `/tmp/midway-store.json` (dev only). On Vercel, attach Neon and the tables create themselves.

## Before mainnet

- Set `NEXT_PUBLIC_POT_WALLET` to a dedicated wallet. Without it, burns still work but no cut is taken and no tickets have a pot behind them.
- Keep `vercel.json`'s cron hour in step with `NEXT_PUBLIC_DRAW_HOUR_UTC` (it runs at :03 and retries at :20), and set `CRON_SECRET` — the route refuses to run in production without it.
- A prize draw with entry tied to activity may be regulated where your users live. Check before you promote it.

## Art

`public/art/banner.webp` is the Midway banner; the Barker's eyes in `components/Stage.tsx` are measured off it (1657×914). If you swap the art, re-measure `EYES` and `LAMP`.
