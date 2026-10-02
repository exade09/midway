import type { Bag, ScanResult } from "./types";
import { LAMPORTS } from "./config";

export const IDLE_LINES = [
  "Step right up. Bring me the bags that broke your heart.",
  "Every rug leaves a body. Every body pays rent. I give it back.",
  "One corpse, one ticket. One ticket, one shot at tonight's pot.",
  "Paste any token. I'll tell you who launched it — and how many they've buried.",
  "The lamp's on. The ground is soft. Who's first?",
  "Nobody sells a dead bag. But anybody can bury one.",
];

const sol = (l: number) => (l / LAMPORTS).toFixed(4);
const short = (a: string) => a.slice(0, 4) + "…" + a.slice(-4);

export function scanSpeech(s: ScanResult): string {
  const by = (st: string) => s.bags.filter((b) => b.status === st).length;
  const rugged = by("RUGGED");
  const dust = by("DUST");
  const empty = by("EMPTY");
  const frozen = by("FROZEN");
  const dying = s.bags
    .filter((b) => b.death && b.death.score >= 50)
    .sort((a, b) => b.death!.score - a.death!.score);

  const parts: string[] = [];
  const who = s.demo ? "stranger" : short(s.owner);
  if (s.totals.burnable === 0) {
    parts.push(`Clean wallet, ${who}. Nothing to bury tonight.`);
  } else {
    const kinds = [rugged && `${rugged} rugged`, dust && `${dust} gone to dust`, empty && `${empty} empty plot${empty > 1 ? "s" : ""}`]
      .filter(Boolean)
      .join(", ");
    parts.push(`Step closer, ${who}. I count ${s.totals.burnable} corpses in your bag — ${kinds}.`);
    parts.push(`That's ◎${sol(s.totals.rentLamports)} of your rent rotting in the dirt.`);
  }
  if (frozen) parts.push(`${frozen} more ${frozen > 1 ? "are" : "is"} frozen by the deployer. Can't bury those — that's a honeypot's handshake.`);
  if (dying.length) {
    const d = dying[0];
    parts.push(`And on the slab: $${d.market.symbol}. Death Clock reads ${d.death!.score}. ${d.death!.symptoms[0]?.text ?? ""}`);
    if (dying.length > 1) parts.push(`${dying.length - 1} more of your living bags look just as pale.`);
  } else if (s.totals.deathwatch) {
    parts.push(`Your living bags are still breathing. For now.`);
  }
  if (s.totals.burnable) parts.push(`Bury them tonight and every real loss is a ticket to the draw.`);
  return parts.join(" ");
}

const CLOSERS: Record<string, string> = {
  "LAST RITES": "Sell what you can, or bury it. Mourning is free; waiting isn't.",
  TERMINAL: "It's coughing blood. Keep one eye on it.",
  SICKLY: "Pale, but walking.",
  STABLE: "Healthy as anything on this lot gets. Lucky you.",
};

export function bagSpeech(b: Bag): string {
  const sym = `$${b.market.symbol}`;
  switch (b.status) {
    case "ALIVE": {
      const d = b.death!;
      const sy = d.symptoms.slice(0, 3).map((x) => x.text).join(" ");
      const days = d.daysLeft != null && d.daysLeft < 30 ? ` At today's bleed rate the pool runs dry in ~${d.daysLeft < 1 ? "hours" : d.daysLeft.toFixed(1) + " days"}.` : "";
      return `${sym} — Death Clock ${d.score}/100, ${d.verdict}. ${sy || "No symptoms worth naming."}${days} ${CLOSERS[d.verdict]}`;
    }
    case "RUGGED":
      return `${sym}: ${b.reason} Nothing left to sell. Bury it and take your ◎${sol(b.rentLamports)} back.`;
    case "DUST":
      return `${sym}: ${b.reason} Swapping costs more than it's worth. Bury it, keep the rent.`;
    case "EMPTY":
      return `An empty plot where ${sym} used to be. Still holding ◎${sol(b.rentLamports)} of yours. Close it.`;
    case "FROZEN":
      return `${sym}: frozen by its deployer. You can't sell it, can't burn it, can't close it. Remember that name.`;
    case "STUCK":
      return `${sym}: withheld transfer fees pin it to the ground. Not tonight.`;
    default:
      return `${sym}: blue-chip. The lot doesn't take these.`;
  }
}

export const BARKER_SYSTEM = `You are THE BARKER, the voice of MIDWAY — a midnight carnival on Solana where people bury rugged memecoins, get their SOL rent back, and win a nightly draw.
Voice: a grim, funny fairground barker. Short sentences. Vivid, a little macabre, never cruel to the user. 2–4 sentences, under 70 words.
Rules: use ONLY the facts provided; never invent numbers, names or events. No financial advice wording ("buy", "you should invest"). You may say a token looks close to death and explain why from the symptoms. Refer to tokens as $SYMBOL. Use ◎ for SOL.`;
