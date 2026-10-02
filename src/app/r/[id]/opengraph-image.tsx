import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { getStore } from "@/lib/store";
import { epochLabel } from "@/lib/epoch";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Midway burial stub";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getStore().getReceipt(Number(id));
  const root = process.cwd();
  const [bg, fell, typewriter] = await Promise.all([
    readFile(join(root, "assets/og-base.jpg")),
    readFile(join(root, "assets/fonts/im-fell-english-sc-latin-400-normal.woff")),
    readFile(join(root, "assets/fonts/special-elite-latin-400-normal.woff")),
  ]);
  const bgSrc = `data:image/jpeg;base64,${bg.toString("base64")}`;
  const names = r ? r.burials.slice(0, 5).map((b) => `$${b.symbol}`) : [];
  const more = r && r.burials.length > 5 ? ` +${r.burials.length - 5}` : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#050505" }}>
        <img src={bgSrc} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, opacity: 0.55 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,5,5,.2), rgba(5,5,5,.85) 55%)" }} />
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 70,
            width: 520,
            height: 490,
            background: "#e3dbc7",
            color: "#1a1712",
            display: "flex",
            flexDirection: "column",
            padding: "36px 40px",
            transform: "rotate(-2deg)",
            boxShadow: "0 40px 80px rgba(0,0,0,.8)",
          }}
        >
          <div style={{ fontFamily: "Type", fontSize: 18, letterSpacing: 5, opacity: 0.7 }}>MIDWAY · PROOF OF LOSS</div>
          <div style={{ fontFamily: "Fell", fontSize: 72, lineHeight: 1, marginTop: 8 }}>Admit One</div>
          <div style={{ fontFamily: "Type", fontSize: 22, marginTop: 10 }}>{r ? `to the draw of ${epochLabel(r.epoch)}` : "to tonight's draw"}</div>
          <div style={{ borderTop: "3px dashed rgba(0,0,0,.25)", margin: "22px 0" }} />
          <div style={{ fontFamily: "Fell", fontSize: 40, display: "flex", flexWrap: "wrap", gap: 14 }}>{(names.join("  ") || "—") + more}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Type", fontSize: 26 }}>
            <span>{r ? `${((r.reclaimedLamports - r.potLamports) / 1e9).toFixed(4)} SOL back` : ""}</span>
            <span>{r ? `${r.tickets.toFixed(1)} tickets` : ""}</span>
          </div>
          <div style={{ position: "absolute", right: 40, top: 200, fontFamily: "Type", fontSize: 40, color: "#c0472f", border: "4px solid #c0472f", padding: "2px 14px", transform: "rotate(-14deg)", opacity: 0.85 }}>BURIED</div>
          <div style={{ position: "absolute", right: 40, top: 40, fontFamily: "Type", fontSize: 26 }}>{`No. ${String(id).padStart(6, "0")}`}</div>
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
