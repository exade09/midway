import "server-only";
import { rpcUrl } from "./config";

let id = 0;

/** Minimal JSON-RPC call against the server RPC. Throws with the RPC's own message on error. */
export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC ${method} → HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result as T;
}

export function isPubkey(s: string | null | undefined): s is string {
  return !!s && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}
