"use client";
import { useEffect, useState } from "react";

/** Periodic value-noise fbm → a horizontally tileable fog texture, generated once and drifted with CSS. */
function fogTexture(w: number, h: number, seed: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const octaves = [4, 8, 16, 32].map((p) => {
    const ph = Math.max(2, Math.round((p * h) / w));
    return { p, ph, g: Array.from({ length: p * ph }, rnd) };
  });
  const fade = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0;
      let amp = 0.55;
      for (const o of octaves) {
        const fx = (x / w) * o.p;
        const fy = (y / h) * o.ph;
        const x0 = Math.floor(fx) % o.p, y0 = Math.min(o.ph - 1, Math.floor(fy));
        const x1 = (x0 + 1) % o.p, y1 = Math.min(o.ph - 1, y0 + 1);
        const tx = fade(fx - Math.floor(fx)), ty = fade(fy - Math.floor(fy));
        const a = o.g[y0 * o.p + x0], b = o.g[y0 * o.p + x1], cc = o.g[y1 * o.p + x0], d = o.g[y1 * o.p + x1];
        v += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty);
        amp *= 0.5;
      }
      // Fog pools toward the ground: fade it out at the top of the band.
      const band = Math.min(1, (y / h) * 1.6);
      const alpha = Math.max(0, Math.min(1, (v - 0.42) * 2.4)) * band;
      const i = (y * w + x) * 4;
      img.data[i] = 214;
      img.data[i + 1] = 222;
      img.data[i + 2] = 218;
      img.data[i + 3] = alpha * 255;
    }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export function Fog({ className = "", opacity = 0.35, speed = 90, seed = 7, height = "45%" }: { className?: string; opacity?: number; speed?: number; seed?: number; height?: string }) {
  const [tex, setTex] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTex(fogTexture(512, 128, seed)));
    return () => cancelAnimationFrame(id);
  }, [seed]);
  if (!tex) return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 ${className}`}
      style={{
        height,
        opacity,
        backgroundImage: `url(${tex})`,
        backgroundSize: "200% 100%",
        backgroundRepeat: "repeat-x",
        filter: "blur(6px)",
        animation: `fogdrift ${speed}s linear infinite`,
      }}
    >
      <style>{`@keyframes fogdrift{from{background-position:0 0}to{background-position:-200% 0}}`}</style>
    </div>
  );
}
