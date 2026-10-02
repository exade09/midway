import { LAMPORTS } from "./config";

export const short = (a: string, n = 4) => (a.length > 2 * n + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a);

export const sol = (lamports: number, dp = 4) => (lamports / LAMPORTS).toFixed(dp);

export function usd(n: number | null | undefined) {
  if (n == null) return "—";
  if (n === 0) return "$0";
  if (n < 0.01) return "<$0.01";
  if (n < 1000) return `$${n.toFixed(n < 10 ? 2 : 0)}`;
  if (n < 1e6) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${(n / 1e6).toFixed(1)}M`;
}

export function compact(n: number) {
  if (n === 0) return "0";
  if (n < 1) return n.toPrecision(2);
  if (n < 1e3) return n.toFixed(n < 10 ? 2 : 0);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`;
  return `${(n / 1e9).toFixed(1)}B`;
}

export function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((v) => String(v).padStart(2, "0")).join(":");
}

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
