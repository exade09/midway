"use client";

/** Streams the Barker's words into `onText`, cancelling whatever he was saying before. */
let current: AbortController | null = null;
export async function speak(body: unknown, onText: (full: string) => void): Promise<string> {
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  let full = "";
  try {
    const res = await fetch("/api/barker", { method: "POST", body: JSON.stringify(body), signal: ctrl.signal, headers: { "content-type": "application/json" } });
    if (!res.body) return full;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += dec.decode(value, { stream: true });
      onText(full);
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") throw e;
  }
  return full;
}
