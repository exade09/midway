"use client";
import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getServerToasts, getToasts, subscribeToasts } from "@/lib/toast";
import { ease } from "@/lib/motion";

export function Toasts() {
  const list = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {list.map((t, i) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.8 : -0.8 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.5, ease: ease.out }}
            className="ticket max-w-md px-5 py-2.5 text-center shadow-[0_18px_40px_rgba(0,0,0,.7)]"
          >
            <span className={`font-type text-[12.5px] tracking-wide ${t.kind === "error" ? "text-blood-2" : t.kind === "ok" ? "text-lamp-deep" : ""}`}>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
