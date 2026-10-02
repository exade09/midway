import { DRAW_HOUR_UTC } from "./config";

const DAY = 86_400_000;
const OFFSET = DRAW_HOUR_UTC * 3_600_000;

/** Draw epochs run from one nightly draw to the next. */
export const epochOf = (ms = Date.now()) => Math.floor((ms - OFFSET) / DAY);
export const closesAt = (epoch: number) => (epoch + 1) * DAY + OFFSET;
export const opensAt = (epoch: number) => epoch * DAY + OFFSET;

export function epochLabel(epoch: number) {
  return new Date(closesAt(epoch)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase();
}
