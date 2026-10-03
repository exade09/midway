import type { Metadata, Viewport } from "next";
import "@fontsource/im-fell-english-sc/400.css";
import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import "@fontsource/special-elite/400.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { SITE_URL, X_HANDLE } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Midway",
  description: "Bury rugged Solana tokens, take your SOL rent back, and every real loss is a ticket to tonight's draw. The Barker reads which of your living bags is next.",
  openGraph: {
    title: "Midway — hand over a dead bag",
    description: "Bury rugged tokens. Get your rent back. Win tonight's pot.",
  },
  twitter: { card: "summary_large_image", site: `@${X_HANDLE}` },
};

export const viewport: Viewport = { themeColor: "#050505", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
