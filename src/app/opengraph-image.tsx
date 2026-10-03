import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Midway — a carnival for dead bags";

/** The default share card: one lamp, the wordmark, the promise. */
export default async function Image() {
  const root = process.cwd();
  const [fell, typewriter] = await Promise.all([
    readFile(join(root, "assets/fonts/im-fell-english-sc-latin-400-normal.woff")),
    readFile(join(root, "assets/fonts/special-elite-latin-400-normal.woff")),
  ]);
  const crosses = Array.from({ length: 22 }, (_, i) => i);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(to bottom, #060707, #0e110f 72%, #050505)" }}>
        <div style={{ position: "absolute", left: 760, top: -220, width: 620, height: 620, borderRadius: 620, background: "radial-gradient(circle, rgba(90,232,168,.35), rgba(90,232,168,.08) 40%, transparent 70%)" }} />
        <div style={{ position: "absolute", left: 1069, top: 0, width: 2, height: 150, background: "#2c302d" }} />
        <div style={{ position: "absolute", left: 1058, top: 150, width: 24, height: 34, borderRadius: 14, background: "#c9ffe6", boxShadow: "0 0 40px 14px rgba(90,232,168,.6)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, height: 1, background: "rgba(236,231,218,.08)" }} />
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 96, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {crosses.map((i) => {
            const h = 22 + ((i * 7) % 4) * 5;
            return (
              <div key={i} style={{ position: "relative", width: 14, height: h, display: "flex" }}>
                <div style={{ position: "absolute", left: 5, top: 0, width: 4, height: h, background: "#1a1d1b" }} />
                <div style={{ position: "absolute", left: 0, top: h * 0.25, width: 14, height: 4, background: "#1a1d1b" }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 80, top: 150, display: "flex", flexDirection: "column", color: "#ece7da" }}>
          <div style={{ fontFamily: "Type", fontSize: 22, letterSpacing: 6, color: "#5ae8a8" }}>OPEN NIGHTLY · SOLANA</div>
          <div style={{ fontFamily: "Fell", fontSize: 150, lineHeight: 1, letterSpacing: 6, marginTop: 18 }}>MIDWAY</div>
          <div style={{ fontFamily: "Fell", fontSize: 44, color: "#c9c4b6", marginTop: 18 }}>Hand over a dead bag.</div>
          <div style={{ fontFamily: "Type", fontSize: 22, color: "#9c9e98", marginTop: 22, letterSpacing: 1 }}>Bury rugs · take your rent back · win tonight&apos;s pot</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fell", data: fell, style: "normal", weight: 400 },
        { name: "Type", data: typewriter, style: "normal", weight: 400 },
      ],
    },
  );
}
