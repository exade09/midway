"use client";

export type ToastKind = "info" | "ok" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

type Fn = (t: Toast[]) => void;
let list: Toast[] = [];
let seq = 0;
const subs = new Set<Fn>();
const emit = () => subs.forEach((f) => f(list));

/** A slip of paper pinned to the top of the screen for a few seconds. */
export function toast(text: string, kind: ToastKind = "info", ms = 3200) {
  const t = { id: ++seq, kind, text };
  list = [...list.slice(-2), t];
  emit();
  setTimeout(() => {
    list = list.filter((x) => x.id !== t.id);
    emit();
  }, ms);
}

export function subscribeToasts(fn: Fn) {
  subs.add(fn);
  return () => void subs.delete(fn);
}
export const getToasts = () => list;
const EMPTY: Toast[] = [];
export const getServerToasts = () => EMPTY;
