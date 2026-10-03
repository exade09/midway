# Midway — a carnival for dead bags

Bury rugged Solana tokens, take your SOL rent back, and every real loss is a ticket to the nightly draw.
The Barker — the rabbit — reads the bags you still hold and tells you which one is closest to zero.

One screen, five acts: **Gate → Reading → Ledger → Burial → Stub**. Public rulebook at `/docs`.

Built for **Vercel**: Next.js 16 (App Router), Neon Postgres, Vercel Cron.

---

## Deploy: GitHub → Vercel

1. **Push to GitHub**
   ```bash
   git remote add origin git@github.com:<you>/midway.git
   git push -u origin main
   ```
2. **Import on Vercel** — *Add New → Project → Import* the repo. Framework is detected; no build settings to change.
3. **Attach a database** — *Storage → Create → Neon* and connect it to the project. `DATABASE_URL` is added for you; tables create themselves on first request.
4. **Set environment variables** (*Settings → Environment Variables*):

   | Variable | Required | What it is |
   |---|---|---|
   | `HELIUS_API_KEY` | yes | Server RPC, wallet scans, burn verification, swap history for losses |
   | `NEXT_PUBLIC_POT_WALLET` | yes | Public address that receives the pot cut and pays winners |
   | `CRON_SECRET` | yes | Any long random string. Vercel sends it to the draw cron |
   | `NEXT_PUBLIC_TOKEN_CA` | — | Token contract shown in the header. Empty → "soon" |
   | `NEXT_PUBLIC_POT_CUT_BPS` | — | Pot cut of reclaimed rent, basis points. Default `500` (5%) |
   | `NEXT_PUBLIC_DRAW_HOUR_UTC` | — | Hour the draw closes. Default `18` (21:00 MSK) |
   | `DRAW_PAYOUT_SECRET` | — | Pot wallet secret key as a JSON byte array, for automatic payouts. Empty → pay by hand |
   | `OPENAI_API_KEY` | — | Lets GPT write the Barker's lines (`OPENAI_MODEL`, default `gpt-5.6`; `OPENAI_REASONING`, default `low`). Tried first |
   | `ANTHROPIC_API_KEY` | — | Lets Claude write the Barker's lines when there's no OpenAI key. Neither → templated lines |
   | `NEXT_PUBLIC_SITE_URL` | — | Your domain. Defaults to Vercel's production URL |

   `NEXT_PUBLIC_*` values are baked in at build time — redeploy after changing them.
5. **Deploy**, then open **`/api/health`**. Every required check should read `true`.

The draw cron is already in `vercel.json` (18:03 UTC, retry 18:20). It works on the Hobby plan; Hobby may run it any time within that hour, which is fine — the seed block is fixed by the chain, not by when the cron fires.

---

## How it works

| Piece | Where | How |
|---|---|---|
| **Scan** | `lib/scan.ts` | SPL + Token-2022 accounts via Helius; markets from Jupiter Tokens v2, DexScreener fallback. Held NFTs are skipped. Cached 15 s per wallet. |
| **Classify** | `lib/classify.ts` | `RUGGED` (no market / pool < $500), `DUST` (< $1), `EMPTY` are buryable. `FROZEN`, `STUCK`, `PROTECTED` never are. |
| **Death Clock** | `lib/deathwatch.ts` | 0–100 from named symptoms: pool depth & bleed, price, holder exodus, sell pressure, volume collapse, whales, live mint/freeze authority, dev bag, serial launcher, bots. |
| **The Barker** | `/api/barker` | Streams his line — GPT or Claude when keyed, templates otherwise. |
| **Burn** | `lib/burn.ts` | Client-built: `burnChecked` + `closeAccount` per bag, ≤ 7 per tx, `MIDWAY` memo, pot cut as a SOL transfer. The user signs everything. |
| **Relay** | `/api/rpc` | Forwards only transactions carrying the `MIDWAY` memo, so the Helius key can't be used for anything else. |
| **Record** | `/api/burn/record` | Re-reads every signature from chain; trusts only what it proves. Replays rejected. |
| **Tickets** | `lib/tickets.ts` | 0 for empty accounts, own launches and tokens with no market proof. Real losses weigh `1 + min(2, log10(1 + $/10))`. 25 per wallet per night. |
| **Draw** | `lib/seed.ts`, `lib/draw.ts` | Seed = first finalized block ≥ 60 s after close. `sha256(seed) mod tickets` over entrants sorted by address. `/api/draw/proof?epoch=N` publishes everything to re-run it. Empty nights roll over. |
| **Graveyard** | drawer + `/api/graveyard` | Fresh graves, lifetime totals, Hall of shame (deployers by mourners). |
| **Rap sheet** | `/api/rapsheet` | Paste a token or deployer: launches, graduations, graves. |
| **Stub** | `/r/[id]` | Shareable receipt with a generated OG card. |
| **Health** | `/api/health` | Deploy checklist — which settings exist, never their values. |

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DEPLOY.ru.md](docs/DEPLOY.ru.md)

---

## Local development

```bash
cp .env.example .env.local     # HELIUS_API_KEY at minimum
npm install
npm run dev                    # http://localhost:3000 · /?demo=1 walks the demo lot
npm run check                  # lint + types + tests
```

Without `DATABASE_URL`, data goes to `/tmp/midway-store.json` — fine locally, lost on Vercel.

## Before you promote it

- Use a dedicated pot wallet. With `DRAW_PAYOUT_SECRET` set, keep nothing else in it.
- A daily prize draw tied to user activity may be regulated where your users live. Check first.

## Art

The backdrop is the Midway banner itself, `public/art/lot.webp`, brought to life in WebGL2 (`components/Backdrop.tsx`): drifting fog, a breathing green lantern on the wheel, a watcher who blinks, crawling paper grain. The lantern and the watcher's eyes are measured off the plate in `LANTERN` and `EYES` — re-measure if you replace the image. Without WebGL2 the plain plate is shown. The Barker's portrait is `public/art/barker.webp`; his eyes are measured off it in `PORTRAIT_EYES` (`components/BarkerPanel.tsx`).
