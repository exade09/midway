import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { rpcUrl, MEMO_PROGRAM, MEMO_TAG } from "@/lib/config";

// Only what the browser needs to send and confirm its own burns. Keeps the Helius key server-side,
// and refuses to relay any transaction that isn't a Midway burial.
const ALLOWED = new Set(["getLatestBlockhash", "sendTransaction", "getSignatureStatuses"]);

function isMidwayTx(b64: string): boolean {
  try {
    const raw = Buffer.from(b64, "base64");
    let programs: string[] = [];
    let datas: Buffer[] = [];
    try {
      const tx = Transaction.from(raw);
      programs = tx.instructions.map((i) => i.programId.toBase58());
      datas = tx.instructions.map((i) => i.data);
    } catch {
      const v = VersionedTransaction.deserialize(raw);
      const keys = v.message.staticAccountKeys;
      programs = v.message.compiledInstructions.map((i) => keys[i.programIdIndex]?.toBase58() ?? "");
      datas = v.message.compiledInstructions.map((i) => Buffer.from(i.data));
    }
    return programs.some((p, i) => p === MEMO_PROGRAM && datas[i].toString("utf8").startsWith(MEMO_TAG));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!calls.length || calls.length > 5 || calls.some((c) => !c || !ALLOWED.has(c.method))) return Response.json({ error: "Method not allowed" }, { status: 403 });
  for (const c of calls) {
    if (c.method === "sendTransaction" && !isMidwayTx(String(c.params?.[0] ?? ""))) return Response.json({ error: "Only Midway burials can be relayed" }, { status: 403 });
  }
  const res = await fetch(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
