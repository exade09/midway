import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "buffer";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { buildBurns } from "../src/lib/burn";
import { demoBags } from "../src/lib/demo";
import { isBurnable } from "../src/lib/classify";

const MEMO = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const kp = Keypair.generate();
const tx = (memo?: string) => {
  const t = new Transaction({ feePayer: kp.publicKey, recentBlockhash: Keypair.generate().publicKey.toBase58() });
  if (memo) t.add(new TransactionInstruction({ programId: new PublicKey(MEMO), keys: [], data: Buffer.from(memo) }));
  t.add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
  t.sign(kp);
  return t.serialize().toString("base64");
};

test("RPC relay forwards only Midway burials", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ result: "ok" }))) as typeof fetch;
  const { POST } = await import("../src/app/api/rpc/route");
  const send = (b64: string) => POST(new Request("http://x", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sendTransaction", params: [b64] }) }));
  assert.equal((await send(tx("MIDWAY|e1|1"))).status, 200);
  assert.equal((await send(tx())).status, 403);
  assert.equal((await send(tx("gm"))).status, 403);
  const other = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ method: "getProgramAccounts" }) }));
  assert.equal(other.status, 403);
});

test("burial transactions fit Solana's 1232-byte limit with a pot cut", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ result: { value: { blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 1 } } }))) as typeof fetch;
  const owner = Keypair.generate();
  const bags = demoBags().filter(isBurnable).map((b, i) => ({
    ...b,
    account: Keypair.generate().publicKey.toBase58(),
    mint: Keypair.generate().publicKey.toBase58(),
    program: i % 2 ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" : b.program,
  }));
  const txs = await buildBurns(bags, owner.publicKey);
  assert.equal(txs.length, Math.ceil(bags.length / 7));
  for (const t of txs) {
    t.add(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1000 }));
    t.sign(owner);
    assert.ok(t.serialize().length <= 1232, `tx is ${t.serialize().length} bytes`);
  }
});
