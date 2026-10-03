"use client";
import { useEffect, useRef } from "react";

/**
 * Ash drifting down across the lot, and moths circling the lamp.
 * `lamp` is the lamp's position as fractions of this canvas; `heat` makes the moths frantic.
 */
export function Particles({ lamp, heat = 0 }: { lamp: { x: number; y: number | ((h: number) => number) }; heat?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const heatRef = useRef(heat);
  const lampRef = useRef(lamp);
  useEffect(() => {
    heatRef.current = heat;
    lampRef.current = lamp;
  }, [heat, lamp]);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const ash = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.3, v: 0.00012 + Math.random() * 0.0004, s: Math.random() * 6.28 }));
    const moths = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * 6.28, r: 0.012 + Math.random() * 0.03, sp: 0.6 + Math.random() * 1.4, wob: Math.random() * 6.28 }));
    let t0 = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(50, now - t0);
      t0 = now;
      ctx.clearRect(0, 0, w, h);
      // Ash
      for (const p of ash) {
        p.y += p.v * dt;
        p.s += 0.0015 * dt;
        p.x += Math.sin(p.s) * 0.00008 * dt;
        if (p.y > 1) { p.y = -0.02; p.x = Math.random(); }
        ctx.fillStyle = `rgba(210,214,208,${0.18 + p.r * 0.12})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 6.283);
        ctx.fill();
      }
      // Moths
      const L = lampRef.current;
      const lx = L.x * w, ly = typeof L.y === "function" ? L.y(h) : L.y * h;
      const frantic = 1 + heatRef.current * 2.5;
      for (const m of moths) {
        m.a += 0.0011 * m.sp * frantic * dt;
        m.wob += 0.009 * dt;
        const rr = Math.min(70, m.r * w) * (1 + 0.25 * Math.sin(m.wob));
        const x = lx + Math.cos(m.a) * rr;
        const y = ly + Math.sin(m.a * 1.3) * rr * 0.6 + rr * 0.15;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
        g.addColorStop(0, "rgba(190,255,220,0.9)");
        g.addColorStop(1, "rgba(90,232,168,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 6.283);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { t0 = performance.now(); raf = requestAnimationFrame(draw); }
    };
    raf = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
