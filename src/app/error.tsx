"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="label text-blood">The lamp went out</div>
      <h1 className="mt-3 font-display text-[clamp(40px,6vw,80px)] leading-[0.95]">Something tripped in the dark.</h1>
      <p className="mx-auto mt-4 max-w-md font-serif text-lg italic text-ash-2">Nothing was signed and nothing moved. Try again — or reload the lot.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-ash">ref {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button className="btn btn-lamp" onClick={reset}>Try again</button>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload the page</button>
      </div>
    </main>
  );
}
