import type { Metadata } from "next";
import { Docs } from "@/components/Docs";

export const metadata: Metadata = {
  title: "Midway",
  description: "How Midway works: burying dead Solana tokens, reclaiming rent, tickets, the nightly draw, the Death Clock and the rap sheet.",
};

export default function DocsPage() {
  return <Docs />;
}
