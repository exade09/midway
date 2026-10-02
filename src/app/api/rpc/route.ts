import { rpcUrl } from "@/lib/config";

// Only what the browser needs to send and confirm its own burns. Keeps the Helius key server-side.
const ALLOWED = new Set(["getLatestBlockhash", "sendTransaction", "getSignatureStatuses", "getBalance", "getFeeForMessage", "simulateTransaction"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!calls.length || calls.some((c) => !c || !ALLOWED.has(c.method))) return Response.json({ error: "Method not allowed" }, { status: 403 });
  const res = await fetch(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
