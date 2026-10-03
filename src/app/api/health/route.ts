import { databaseUrl } from "@/lib/store";
import { POT_WALLET, POT_CUT_BPS, DRAW_HOUR_UTC, TOKEN_CA, SITE_URL } from "@/lib/config";
import { closesAt, epochOf } from "@/lib/epoch";

/**
 * Deploy checklist as JSON. Open /api/health after every deploy: anything false is something to set in Vercel.
 * Never returns secret values — only whether they exist.
 */
export async function GET() {
  const checks = {
    heliusKey: !!process.env.HELIUS_API_KEY,
    database: !!databaseUrl(),
    potWallet: !!POT_WALLET,
    cronSecret: !!process.env.CRON_SECRET,
    autoPayout: !!process.env.DRAW_PAYOUT_SECRET,
    barkerLLM: !!process.env.ANTHROPIC_API_KEY,
    tokenCA: !!TOKEN_CA,
  };
  const required = checks.heliusKey && checks.database && checks.potWallet && checks.cronSecret;
  return Response.json({
    ok: required,
    checks,
    config: { siteUrl: SITE_URL, potCutBps: POT_CUT_BPS, drawHourUtc: DRAW_HOUR_UTC, nextDraw: new Date(closesAt(epochOf())).toISOString() },
    region: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
