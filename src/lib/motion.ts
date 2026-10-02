/** Motion tokens. Everything settles; nothing bounces — this is a funeral with a calliope, not a toy store. */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  ink: [0.22, 0.9, 0.24, 1] as const,
  drop: [0.5, 0, 0.75, 0] as const,
};
export const dur = { quick: 0.18, base: 0.42, slow: 0.9, scene: 1.6, crawl: 3.2 };
export const spring = { soft: { type: "spring", stiffness: 140, damping: 22, mass: 0.9 } as const };
