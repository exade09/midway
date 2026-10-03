"use client";
import { useEffect, useRef, useState } from "react";

/**
 * The backdrop: the Midway banner itself — the ink-drawn lot at night — brought to life in WebGL2.
 * Fog drifts over the field, the green lantern on the wheel breathes and sputters, the watcher on the right
 * blinks now and then, and the paper grain crawls. `speed`, `glow` and `tint` let the story push it
 * (fog runs while a wallet is read, the lantern flares at a burial and turns amber on a grim reading).
 * Without WebGL2 the plain plate stays on screen.
 */
const PLATE = "/art/lot.webp";
const PLATE_ASPECT = 2172 / 724;
/** Measured off the plate, in plate UV (top-left origin). */
const LANTERN: [number, number] = [0.626, 0.287];
const EYES: [number, number] = [0.8435, 0.3];

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_fogt;  // fog clock, runs faster while a wallet is read
uniform float u_glow;
uniform vec3 u_tint;
uniform vec4 u_crop;   // u0, v0, width, height of the visible part of the plate
uniform vec2 u_par;    // pointer parallax
uniform float u_blink; // 0 open → 1 shut
uniform sampler2D u_plate;
out vec4 fragColor;

const vec2 LANTERN = vec2(${LANTERN[0]}, ${LANTERN[1]});
const vec2 EYES = vec2(${EYES[0]}, ${EYES[1]});
const float ASPECT = ${PLATE_ASPECT.toFixed(4)};

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 s = gl_FragCoord.xy / u_resolution;
  s.y = 1.0 - s.y;
  vec2 p = u_crop.xy + s * u_crop.zw + u_par * u_crop.zw * 0.012;
  vec3 col = texture(u_plate, p).rgb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));

  // The lantern's own green, re-lit with the current tint (amber on a grim reading).
  float green = clamp((col.g - max(col.r, col.b)) * 4.0, 0.0, 1.0);
  float flick = 0.86 + 0.1 * noise(vec2(u_time * 7.0, 1.3)) + 0.08 * sin(u_time * 2.3);
  flick *= 1.0 - 0.55 * step(0.965, noise(vec2(u_time * 3.1, 9.0))); // the odd sputter
  col = mix(col, u_tint * (0.35 + lum * 1.6) * flick * (1.0 + u_glow * 0.6), green);

  // The watcher blinks.
  vec2 e = (p - EYES) * vec2(ASPECT, 1.0);
  float eyes = smoothstep(0.03, 0.0, length(e * vec2(1.0, 1.6))) * smoothstep(0.45, 0.75, lum);
  col = mix(col, vec3(0.07), eyes * u_blink);

  // Fog: two layers drifting across the field, thicker low, a band along the horizon.
  vec2 q = vec2(p.x * ASPECT, p.y);
  float t = u_fogt;
  float f1 = fbm(q * vec2(1.6, 4.0) + vec2(t * 0.045, 0.0));
  float f2 = fbm(q * vec2(3.2, 7.0) + vec2(-t * 0.07, t * 0.01) + f1);
  float low = smoothstep(0.45, 1.0, p.y);
  float band = exp(-pow((p.y - 0.62) * 7.0, 2.0));
  float fog = clamp((f1 * 0.6 + f2 * 0.5 - 0.35) * (low * 0.9 + band * 0.7), 0.0, 1.0);
  col = mix(col, vec3(0.46, 0.48, 0.47), fog * 0.42);

  // The lantern's light: a halo and a spill over the fog near it.
  vec2 d = (p - LANTERN) * vec2(ASPECT, 1.0);
  float r2 = dot(d, d);
  float halo = exp(-r2 * 260.0) * 0.55 + exp(-r2 * 22.0) * 0.12;
  col += u_tint * halo * flick * (1.0 + u_glow * 2.2);
  col += u_tint * fog * exp(-r2 * 6.0) * 0.12 * flick;

  // A burial lifts the whole lot for a moment.
  col *= 1.0 + u_glow * 0.18;

  // Paper grain, crawling at a hand-drawn frame rate.
  float g = hash(floor(gl_FragCoord.xy) + floor(u_time * 12.0) * 7.31) - 0.5;
  col += g * 0.045;

  fragColor = vec4(col, 1.0);
}`;

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

/** Which part of the plate fits the screen: cover-fit, with the lantern over the open middle on wide screens. */
function crop(w: number, h: number): [number, number, number, number] {
  const a = w / Math.max(h, 1);
  if (a <= PLATE_ASPECT) {
    const fw = a / PLATE_ASPECT;
    const fx = w >= 1024 ? 0.56 : 0.5;
    const u0 = Math.min(Math.max(LANTERN[0] - fx * fw, 0), 1 - fw);
    return [u0, 0, fw, 1];
  }
  const fh = PLATE_ASPECT / a;
  return [0, (1 - fh) * 0.35, 1, fh];
}

export function Backdrop({ speed = 1, glow = 0, tint = [0.3, 0.88, 0.63] }: { speed?: number; glow?: number; tint?: [number, number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ speed, glow, tint });
  const [pos, setPos] = useState("62% 0%");
  useEffect(() => {
    live.current = { speed, glow, tint };
  }, [speed, glow, tint]);

  // The fallback plate uses the same framing as the shader.
  useEffect(() => {
    const place = () => {
      const [u0, v0, fw, fh] = crop(window.innerWidth, window.innerHeight);
      setPos(`${fw < 1 ? (u0 / (1 - fw)) * 100 : 50}% ${fh < 1 ? (v0 / (1 - fh)) * 100 : 0}%`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl || gl.isContextLost()) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    } catch (e) {
      console.warn("[midway] backdrop shader unavailable:", e);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("u_resolution"), uTime = u("u_time"), uFog = u("u_fogt"), uGlow = u("u_glow");
    const uTint = u("u_tint"), uCrop = u("u_crop"), uPar = u("u_par"), uBlink = u("u_blink");

    const tex = gl.createTexture();
    let ready = false;
    let raf = 0;
    let disposed = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true;
      canvas.style.opacity = "";
    };
    img.src = PLATE;

    // The plate is only ~2k wide, so there is nothing to gain past 1600px of canvas.
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1600 / Math.max(window.innerWidth, 1));
      canvas.width = Math.max(320, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(200, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Gentle parallax: the lot drifts against the pointer.
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      par.tx = e.clientX / window.innerWidth - 0.5;
      par.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 0;
    let fogT = 0;
    let g = 0;
    let nextBlink = 4;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
      if (!ready) return;
      const L = live.current;
      t += dt;
      fogT += dt * L.speed * (reduce ? 0.2 : 1);
      g += (L.glow - g) * Math.min(1, dt * 4);
      par.x += (par.tx - par.x) * Math.min(1, dt * 2);
      par.y += (par.ty - par.y) * Math.min(1, dt * 2);
      // A blink every few seconds, ~140ms shut.
      if (t > nextBlink + 0.14) nextBlink = t + 3 + Math.random() * 6;
      const blink = t > nextBlink ? 1 : 0;
      const [u0, v0, fw, fh] = crop(window.innerWidth, window.innerHeight);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduce ? t * 0.3 : t);
      gl.uniform1f(uFog, fogT);
      gl.uniform1f(uGlow, g);
      gl.uniform3f(uTint, L.tint[0], L.tint[1], L.tint[2]);
      gl.uniform4f(uCrop, u0, v0, fw, fh);
      gl.uniform2f(uPar, reduce ? 0 : par.x, reduce ? 0 : par.y);
      gl.uniform1f(uBlink, blink);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      // Free what we made but keep the context: in dev React mounts twice on the same canvas.
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
      <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" style={{ opacity: 0 }} />
    </>
  );
}
