"use client";
import { useEffect, useRef } from "react";

/**
 * The backdrop: "Crepuscular sphere" (fragcoord.xyz/s/czdba6cy) — a raymarched sphere with godrays —
 * ported to WebGL2, tinted toward the lamp's green, and tuned to stay a backdrop:
 * rendered at reduced resolution, no supersampling, fewer march steps, paused when the tab is hidden.
 * `speed` and `glow` let the story push it (faster while reading a wallet, a flash of light at a burial).
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_glow;
uniform vec3 u_tint;
out vec4 fragColor;

mat3 rot(float a) {
  return mat3(
    cos(a), sin(a / 2.) * sin(a), sin(a) * cos(a / 2.),
    0.0, cos(a / 2.), -sin(a / 2.),
    -sin(a), sin(a / 2.) * cos(a), cos(a / 2.) * cos(a)
  );
}

mat3 globalRot;
mat3 globalInvRot;
const float radius = 2.6;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float SDF(vec3 p) {
  vec3 p1 = p;
  p1.zyx += sin(p.xzy * 4.0) / 0.9;
  return -smin(length(p1) - radius, radius - length(p), 0.4);
}

vec3 color(vec3 p) {
  const float eps = 0.001;
  vec3 normal = globalInvRot * normalize(vec3(
    SDF(p + vec3(eps, 0, 0)) - SDF(p - vec3(eps, 0, 0)),
    SDF(p + vec3(0, eps, 0)) - SDF(p - vec3(0, eps, 0)),
    SDF(p + vec3(0, 0, eps)) - SDF(p - vec3(0, 0, eps))
  ));
  vec3 next = 1.0 - (normal * 0.5 + 0.5);
  next = vec3(dot(next, vec3(1)) / 3.0);
  return 1.025 - next * next;
}

void main() {
  globalRot = rot(u_time);
  globalInvRot = transpose(globalRot);
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec3 ro = globalRot * vec3(0, 0, -12.0);
  vec3 rd = globalRot * normalize(vec3(uv, 3));

  vec3 p; float d = 1.0, t = 0.0, godrays = 0.0;
  for (int i = 0; i < 256; i++) {
    if (d <= 0.005 || t >= 20.0) break;
    p = ro + rd * t;
    d = SDF(p) / 5.0;
    float fog = length(p) > radius ? smoothstep(0.0, 0.5, SDF(normalize(p) * radius)) : 1.0;
    godrays += (0.4 / (1.0 + dot(p, p) * 10.)) * fog;
    t += d;
  }

  vec3 col = vec3(0.035);
  if (t < 20.0) col = color(p) * 0.1;
  // Same light as the original, with a breath of the lamp's green in it.
  col += godrays * mix(vec3(1.0), u_tint, 0.28) * (1.0 + u_glow);
  fragColor = vec4(col, 1.0);
}`;

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

export function Sphere({ speed = 1, glow = 0, tint = [0.55, 1.0, 0.8] }: { speed?: number; glow?: number; tint?: [number, number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ speed, glow, tint });
  useEffect(() => {
    live.current = { speed, glow, tint };
  }, [speed, glow, tint]);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return; // The CSS fallback behind the canvas stays visible.

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
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uGlow = gl.getUniformLocation(prog, "u_glow");
    const uTint = gl.getUniformLocation(prog, "u_tint");

    // A soft, glowing image: ~¾ resolution (capped at 1300px wide) keeps edges clean at a fraction of the cost.
    const resize = () => {
      const scale = Math.min(0.75, 1300 / Math.max(window.innerWidth, 1));
      canvas.width = Math.max(320, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(200, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 7.0; // start on a flattering angle
    let g = 0;
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      t += dt * 0.32 * L.speed * (reduce ? 0.15 : 1);
      g += (L.glow - g) * Math.min(1, dt * 4); // ease toward the target glow
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uGlow, g);
      gl.uniform3f(uTint, L.tint[0], L.tint[1], L.tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
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
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <>
      <div className="absolute inset-0" style={{ background: "radial-gradient(40% 50% at 50% 50%, rgba(90,232,168,.10), rgba(10,11,10,1) 70%)" }} />
      <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full max-lg:opacity-45" style={{ filter: "blur(0.5px)" }} />
    </>
  );
}
