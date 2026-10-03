import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Midway — a carnival for dead bags",
    short_name: "Midway",
    description: "Bury rugged Solana tokens, take your rent back, win the nightly draw.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [{ src: "/icon.png", sizes: "256x256", type: "image/png" }],
  };
}
