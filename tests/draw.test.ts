import { test } from "node:test";
import assert from "node:assert/strict";
import { pickWinner } from "../src/lib/draw";
import { closesAt, epochOf, opensAt } from "../src/lib/epoch";

test("pickWinner is deterministic and order-independent", () => {
  const e = [{ owner: "b", tickets: 3 }, { owner: "a", tickets: 1 }, { owner: "c", tickets: 2.5 }];
  const w1 = pickWinner(e, "seed:1");
  const w2 = pickWinner([...e].reverse(), "seed:1");
  assert.equal(w1, w2);
  assert.equal(pickWinner([], "x"), null);
});

test("pickWinner respects ticket weight", () => {
  const e = [{ owner: "heavy", tickets: 24 }, { owner: "light", tickets: 1 }];
  let heavy = 0;
  for (let i = 0; i < 2000; i++) if (pickWinner(e, "s" + i) === "heavy") heavy++;
  assert.ok(heavy > 1800 && heavy < 1990, `heavy won ${heavy}/2000`);
});

test("epochs run draw to draw", () => {
  const n = epochOf(Date.UTC(2026, 9, 2, 12));
  assert.ok(opensAt(n) <= Date.UTC(2026, 9, 2, 12) && Date.UTC(2026, 9, 2, 12) < closesAt(n));
  assert.equal(new Date(closesAt(n)).getUTCHours(), 18);
});
