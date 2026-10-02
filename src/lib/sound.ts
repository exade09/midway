"use client";

/**
 * Procedural sound design. No samples to load — every sound is synthesised, so it's tiny and instant.
 * Starts only after a user gesture (browser autoplay rules), and remembers the mute choice.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private amb: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private listeners = new Set<(m: boolean) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = window.localStorage.getItem("midway:muted") === "1";
      } catch {}
    }
  }

  onChange(fn: (m: boolean) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  start() {
    if (this.ctx || typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.ambience();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      window.localStorage.setItem("midway:muted", m ? "1" : "0");
    } catch {}
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.15);
    this.listeners.forEach((f) => f(m));
  }

  private get ok() {
    if (!this.ctx || !this.master) return false;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return true;
  }

  private noiseSrc() {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    return s;
  }

  private env(g: GainNode, t: number, a: number, peak: number, r: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
  }

  /** Wind across the lot, a far-off calliope drone and the lamp's electric hum. */
  private ambience() {
    const ctx = this.ctx!;
    this.amb = ctx.createGain();
    this.amb.gain.value = 0;
    this.amb.connect(this.master!);
    this.amb.gain.setTargetAtTime(1, ctx.currentTime, 2.5);

    const wind = this.noiseSrc();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.7;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.07;
    const wlfoG = ctx.createGain();
    wlfoG.gain.value = 220;
    wlfo.connect(wlfoG).connect(bp.frequency);
    const wg = ctx.createGain();
    wg.gain.value = 0.05;
    wind.connect(bp).connect(wg).connect(this.amb);
    wind.start();
    wlfo.start();

    // A tired calliope a few tents over: a minor chord, slow vibrato, heavily filtered.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const og = ctx.createGain();
    og.gain.value = 0.009;
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.18;
    const tremG = ctx.createGain();
    tremG.gain.value = 0.004;
    trem.connect(tremG).connect(og.gain);
    trem.start();
    lp.connect(og).connect(this.amb);
    for (const f of [110, 130.81, 164.81, 220.4]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.2 + Math.random();
      const vg = ctx.createGain();
      vg.gain.value = f * 0.004;
      vib.connect(vg).connect(o.frequency);
      o.connect(lp);
      o.start();
      vib.start();
    }

    const hum = ctx.createOscillator();
    hum.frequency.value = 100;
    const hg = ctx.createGain();
    hg.gain.value = 0.006;
    hum.connect(hg).connect(this.amb);
    hum.start();
  }

  /** Filament catching: a crackle and a tick. */
  flicker() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const g = ctx.createGain();
    this.env(g, t, 0.002, 0.18, 0.06);
    n.connect(hp).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.1);
  }

  tick() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 1800;
    const g = ctx.createGain();
    this.env(g, t, 0.001, 0.035, 0.025);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.05);
  }

  /** Searchlight sweep for the scan. */
  sweep(seconds = 2.2) {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(620, t + seconds);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + seconds + 0.05);
  }

  /** Rubber stamp on paper. */
  stamp() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const g = ctx.createGain();
    this.env(g, t, 0.002, 0.5, 0.16);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.22);
    const n = this.noiseSrc();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const ng = ctx.createGain();
    this.env(ng, t, 0.001, 0.22, 0.07);
    n.connect(lp).connect(ng).connect(this.master!);
    n.start(t);
    n.stop(t + 0.1);
  }

  /** A shovel of earth landing on a coffin. */
  thud() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noiseSrc();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const g = ctx.createGain();
    this.env(g, t, 0.004, 0.45, 0.38);
    n.connect(lp).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.5);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.3);
    const og = ctx.createGain();
    this.env(og, t, 0.004, 0.35, 0.3);
    o.connect(og).connect(this.master!);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** Green fire: the burn itself. */
  whoosh() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noiseSrc();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(200, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.9);
    bp.frequency.exponentialRampToValueAtTime(400, t + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    n.connect(bp).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 2);
  }

  /** Coin landing in the tin — SOL coming home. */
  coin(pitch = 1) {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (const [f, d] of [[1975, 0], [2637, 0.05]] as const) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f * pitch;
      const g = ctx.createGain();
      this.env(g, t + d, 0.002, 0.07, 0.35);
      o.connect(g).connect(this.master!);
      o.start(t + d);
      o.stop(t + d + 0.4);
    }
  }

  /** Funeral bell for the end of the ritual. */
  bell() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (const [ratio, amp] of [[1, 0.2], [2.76, 0.08], [5.4, 0.04], [0.5, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = 196 * ratio;
      const g = ctx.createGain();
      this.env(g, t, 0.004, amp, 3.2);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 3.4);
    }
  }

  /** Ticket tearing off the roll. */
  tear() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const n = this.noiseSrc();
      const hp = ctx.createBiquadFilter();
      hp.type = "bandpass";
      hp.frequency.value = 3000 + Math.random() * 2000;
      const g = ctx.createGain();
      const s = t + i * 0.022;
      this.env(g, s, 0.001, 0.09, 0.02);
      n.connect(hp).connect(g).connect(this.master!);
      n.start(s);
      n.stop(s + 0.04);
    }
  }

  /** Calliope sting — a three-note fanfare gone slightly wrong. */
  sting() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    [392, 466.16, 587.33, 554.37].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1600;
      const g = ctx.createGain();
      const s = t + i * 0.13;
      this.env(g, s, 0.01, 0.05, i === 3 ? 0.9 : 0.16);
      o.connect(lp).connect(g).connect(this.master!);
      o.start(s);
      o.stop(s + 1);
    });
  }
}

export const sound = new SoundEngine();
