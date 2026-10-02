import "server-only";
import { promises as fs } from "fs";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Burial, Receipt } from "./types";
import { TICKET_CAP } from "./config";

export interface DrawRow {
  epoch: number;
  winner: string | null;
  potLamports: number;
  ticketsTotal: number;
  seed: string;
  slot: number;
  paidSig: string | null;
  createdAt: string;
}

export interface Store {
  sigsUsed(sigs: string[]): Promise<string[]>;
  addReceipt(r: Omit<Receipt, "id">): Promise<Receipt>;
  getReceipt(id: number): Promise<Receipt | null>;
  /** Tickets per owner for an epoch, already capped. */
  entrants(epoch: number): Promise<{ owner: string; tickets: number }[]>;
  potLamports(epoch: number): Promise<number>;
  recentBurials(limit: number): Promise<Burial[]>;
  burialsByDeployer(deployer: string): Promise<Burial[]>;
  topDeployers(limit: number): Promise<{ deployer: string; buried: number; mourners: number; lossUsd: number }[]>;
  saveDraw(d: DrawRow): Promise<void>;
  getDraw(epoch: number): Promise<DrawRow | null>;
  lastDraw(): Promise<DrawRow | null>;
  setPaid(epoch: number, sig: string): Promise<void>;
}

/* ───────────────────────── Postgres (Neon) ───────────────────────── */

class PgStore implements Store {
  private sql: NeonQueryFunction<false, false>;
  private ready: Promise<void>;
  constructor(url: string) {
    this.sql = neon(url);
    this.ready = this.migrate();
  }
  private async migrate() {
    const sql = this.sql;
    await sql`CREATE TABLE IF NOT EXISTS receipts (
      id SERIAL PRIMARY KEY, owner TEXT NOT NULL, epoch INT NOT NULL, sigs TEXT[] NOT NULL,
      reclaimed BIGINT NOT NULL, pot BIGINT NOT NULL, tickets REAL NOT NULL, loss_usd REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS burials (
      id SERIAL PRIMARY KEY, receipt_id INT NOT NULL REFERENCES receipts(id), sig TEXT NOT NULL,
      owner TEXT NOT NULL, mint TEXT NOT NULL, symbol TEXT, name TEXT, icon TEXT,
      rent BIGINT NOT NULL, loss_usd REAL, tickets REAL NOT NULL, epoch INT NOT NULL, deployer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS burials_epoch ON burials(epoch)`;
    await sql`CREATE INDEX IF NOT EXISTS burials_deployer ON burials(deployer)`;
    await sql`CREATE TABLE IF NOT EXISTS used_sigs (sig TEXT PRIMARY KEY)`;
    await sql`CREATE TABLE IF NOT EXISTS draws (
      epoch INT PRIMARY KEY, winner TEXT, pot BIGINT NOT NULL, tickets REAL NOT NULL,
      seed TEXT NOT NULL, slot BIGINT NOT NULL, paid_sig TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  }
  async sigsUsed(sigs: string[]) {
    await this.ready;
    const rows = (await this.sql`SELECT sig FROM used_sigs WHERE sig = ANY(${sigs})`) as { sig: string }[];
    return rows.map((r) => r.sig);
  }
  async addReceipt(r: Omit<Receipt, "id">): Promise<Receipt> {
    await this.ready;
    const sql = this.sql;
    for (const s of r.sigs) await sql`INSERT INTO used_sigs(sig) VALUES (${s})`; // PK rejects replays
    const [{ id }] = (await sql`INSERT INTO receipts(owner, epoch, sigs, reclaimed, pot, tickets, loss_usd)
      VALUES (${r.owner}, ${r.epoch}, ${r.sigs}, ${r.reclaimedLamports}, ${r.potLamports}, ${r.tickets}, ${r.lossUsd})
      RETURNING id`) as { id: number }[];
    for (const b of r.burials)
      await sql`INSERT INTO burials(receipt_id, sig, owner, mint, symbol, name, icon, rent, loss_usd, tickets, epoch, deployer)
        VALUES (${id}, ${b.sig}, ${b.owner}, ${b.mint}, ${b.symbol}, ${b.name}, ${b.icon ?? null}, ${b.rentLamports},
                ${b.lossUsd}, ${b.tickets}, ${b.epoch}, ${b.deployer ?? null})`;
    return { ...r, id };
  }
  async getReceipt(id: number) {
    await this.ready;
    const [r] = (await this.sql`SELECT * FROM receipts WHERE id = ${id}`) as Record<string, unknown>[];
    if (!r) return null;
    const bs = (await this.sql`SELECT * FROM burials WHERE receipt_id = ${id} ORDER BY id`) as Record<string, unknown>[];
    return {
      id: r.id as number, owner: r.owner as string, epoch: r.epoch as number, sigs: r.sigs as string[],
      reclaimedLamports: Number(r.reclaimed), potLamports: Number(r.pot), tickets: Number(r.tickets),
      lossUsd: r.loss_usd == null ? null : Number(r.loss_usd), createdAt: new Date(r.created_at as string).toISOString(),
      burials: bs.map(rowToBurial),
    };
  }
  async entrants(epoch: number) {
    await this.ready;
    const rows = (await this.sql`SELECT owner, LEAST(SUM(tickets), ${TICKET_CAP}) AS t FROM burials
      WHERE epoch = ${epoch} GROUP BY owner HAVING SUM(tickets) > 0 ORDER BY owner`) as { owner: string; t: number }[];
    return rows.map((r) => ({ owner: r.owner, tickets: Number(r.t) }));
  }
  async potLamports(epoch: number) {
    await this.ready;
    const [{ p }] = (await this.sql`SELECT COALESCE(SUM(pot),0) AS p FROM receipts WHERE epoch = ${epoch}`) as { p: string }[];
    // Unclaimed pots (no entrants) roll into the next night.
    const [{ r }] = (await this.sql`SELECT COALESCE(SUM(pot),0) AS r FROM draws WHERE winner IS NULL AND epoch < ${epoch}
      AND epoch > COALESCE((SELECT MAX(epoch) FROM draws WHERE winner IS NOT NULL AND epoch < ${epoch}), -1)`) as { r: string }[];
    return Number(p) + Number(r);
  }
  async recentBurials(limit: number) {
    await this.ready;
    return ((await this.sql`SELECT * FROM burials ORDER BY id DESC LIMIT ${limit}`) as Record<string, unknown>[]).map(rowToBurial);
  }
  async burialsByDeployer(deployer: string) {
    await this.ready;
    return ((await this.sql`SELECT * FROM burials WHERE deployer = ${deployer} ORDER BY id DESC LIMIT 200`) as Record<string, unknown>[]).map(rowToBurial);
  }
  async topDeployers(limit: number) {
    await this.ready;
    const rows = (await this.sql`SELECT deployer, COUNT(DISTINCT mint) AS b, COUNT(DISTINCT owner) AS m, COALESCE(SUM(loss_usd),0) AS l
      FROM burials WHERE deployer IS NOT NULL GROUP BY deployer ORDER BY m DESC, b DESC LIMIT ${limit}`) as Record<string, unknown>[];
    return rows.map((r) => ({ deployer: r.deployer as string, buried: Number(r.b), mourners: Number(r.m), lossUsd: Number(r.l) }));
  }
  async saveDraw(d: DrawRow) {
    await this.ready;
    await this.sql`INSERT INTO draws(epoch, winner, pot, tickets, seed, slot, paid_sig)
      VALUES (${d.epoch}, ${d.winner}, ${d.potLamports}, ${d.ticketsTotal}, ${d.seed}, ${d.slot}, ${d.paidSig})
      ON CONFLICT (epoch) DO NOTHING`;
  }
  async getDraw(epoch: number) {
    await this.ready;
    const [r] = (await this.sql`SELECT * FROM draws WHERE epoch = ${epoch}`) as Record<string, unknown>[];
    return r ? rowToDraw(r) : null;
  }
  async lastDraw() {
    await this.ready;
    const [r] = (await this.sql`SELECT * FROM draws ORDER BY epoch DESC LIMIT 1`) as Record<string, unknown>[];
    return r ? rowToDraw(r) : null;
  }
  async setPaid(epoch: number, sig: string) {
    await this.ready;
    await this.sql`UPDATE draws SET paid_sig = ${sig} WHERE epoch = ${epoch}`;
  }
}

function rowToBurial(r: Record<string, unknown>): Burial {
  return {
    sig: r.sig as string, owner: r.owner as string, mint: r.mint as string, symbol: (r.symbol as string) ?? "",
    name: (r.name as string) ?? "", icon: (r.icon as string) ?? undefined, rentLamports: Number(r.rent),
    lossUsd: r.loss_usd == null ? null : Number(r.loss_usd), tickets: Number(r.tickets), epoch: Number(r.epoch),
    deployer: (r.deployer as string) ?? null, createdAt: new Date(r.created_at as string).toISOString(),
  };
}
function rowToDraw(r: Record<string, unknown>): DrawRow {
  return {
    epoch: Number(r.epoch), winner: (r.winner as string) ?? null, potLamports: Number(r.pot), ticketsTotal: Number(r.tickets),
    seed: r.seed as string, slot: Number(r.slot), paidSig: (r.paid_sig as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

/* ─────────────── File fallback for local dev (single JSON in /tmp) ─────────────── */

type FileData = { receipts: Receipt[]; draws: DrawRow[]; used: string[] };
const FILE = process.env.MIDWAY_STORE_FILE ?? "/tmp/midway-store.json";

class FileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  private async read(): Promise<FileData> {
    try {
      return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ FILE, "utf8")) as FileData;
    } catch {
      return { receipts: [], draws: [], used: [] };
    }
  }
  /** Serialise read-modify-write so concurrent requests can't clobber each other. */
  private mutate<T>(fn: (d: FileData) => T): Promise<T> {
    const next = this.queue.then(async () => {
      const d = await this.read();
      const out = fn(d);
      await fs.writeFile(/*turbopackIgnore: true*/ FILE, JSON.stringify(d));
      return out;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
  private burials(d: FileData) {
    return d.receipts.flatMap((r) => r.burials);
  }
  async sigsUsed(sigs: string[]) {
    const d = await this.read();
    return sigs.filter((s) => d.used.includes(s));
  }
  addReceipt(r: Omit<Receipt, "id">) {
    return this.mutate((d) => {
      if (r.sigs.some((s) => d.used.includes(s))) throw new Error("Signature already recorded");
      d.used.push(...r.sigs);
      const rec = { ...r, id: (d.receipts.at(-1)?.id ?? 0) + 1 };
      d.receipts.push(rec);
      return rec;
    });
  }
  async getReceipt(id: number) {
    return (await this.read()).receipts.find((r) => r.id === id) ?? null;
  }
  async entrants(epoch: number) {
    const m = new Map<string, number>();
    for (const b of this.burials(await this.read())) if (b.epoch === epoch) m.set(b.owner, (m.get(b.owner) ?? 0) + b.tickets);
    return [...m].filter(([, t]) => t > 0).map(([owner, t]) => ({ owner, tickets: Math.min(t, TICKET_CAP) })).sort((a, b) => a.owner.localeCompare(b.owner));
  }
  async potLamports(epoch: number) {
    const d = await this.read();
    const own = d.receipts.filter((r) => r.epoch === epoch).reduce((t, r) => t + r.potLamports, 0);
    const lastWin = Math.max(-1, ...d.draws.filter((x) => x.winner && x.epoch < epoch).map((x) => x.epoch));
    const roll = d.draws.filter((x) => !x.winner && x.epoch < epoch && x.epoch > lastWin).reduce((t, x) => t + x.potLamports, 0);
    return own + roll;
  }
  async recentBurials(limit: number) {
    return this.burials(await this.read()).reverse().slice(0, limit);
  }
  async burialsByDeployer(deployer: string) {
    return this.burials(await this.read()).filter((b) => b.deployer === deployer).reverse();
  }
  async topDeployers(limit: number) {
    const m = new Map<string, { mints: Set<string>; owners: Set<string>; loss: number }>();
    for (const b of this.burials(await this.read())) {
      if (!b.deployer) continue;
      const e = m.get(b.deployer) ?? { mints: new Set(), owners: new Set(), loss: 0 };
      e.mints.add(b.mint); e.owners.add(b.owner); e.loss += b.lossUsd ?? 0;
      m.set(b.deployer, e);
    }
    return [...m].map(([deployer, e]) => ({ deployer, buried: e.mints.size, mourners: e.owners.size, lossUsd: e.loss }))
      .sort((a, b) => b.mourners - a.mourners || b.buried - a.buried).slice(0, limit);
  }
  saveDraw(dr: DrawRow) {
    return this.mutate((d) => {
      if (!d.draws.some((x) => x.epoch === dr.epoch)) d.draws.push(dr);
    });
  }
  async getDraw(epoch: number) {
    return (await this.read()).draws.find((x) => x.epoch === epoch) ?? null;
  }
  async lastDraw() {
    return (await this.read()).draws.sort((a, b) => b.epoch - a.epoch)[0] ?? null;
  }
  setPaid(epoch: number, sig: string) {
    return this.mutate((d) => {
      const x = d.draws.find((y) => y.epoch === epoch);
      if (x) x.paidSig = sig;
    });
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) store = process.env.DATABASE_URL ? new PgStore(process.env.DATABASE_URL) : new FileStore();
  return store;
}
