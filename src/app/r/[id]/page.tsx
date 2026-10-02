import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { App } from "@/components/App";
import { getStore } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return null;
  return getStore().getReceipt(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).id);
  if (!r) return {};
  const n = r.burials.length;
  return {
    title: `Stub No. ${String(r.id).padStart(6, "0")} — Midway`,
    description: `${n} dead ${n === 1 ? "bag" : "bags"} buried. ${r.tickets.toFixed(1)} tickets for tonight's draw.`,
  };
}

export default async function ReceiptPage({ params }: Props) {
  const r = await load((await params).id);
  if (!r) notFound();
  return <App receipt={r} />;
}
