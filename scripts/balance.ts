import { fixtureDirectory, fixturePath } from "./fixture-path";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  initialGame,
  simulateHours,
  applyAction,
  projectProgress,
  TIERS,
  repairCost,
  MISSIONS,
  DAY_MS,
} from "../src/sim";
mkdirSync(fixtureDirectory, { recursive: true });
for (const sessions of [2, 3, 4]) {
  let s = initialGame("ทดสอบสมดุล");
  let complete = 0;
  const milestones: string[] = [];
  for (let i = 1; i <= 30 * sessions; i++) {
    s = simulateHours(s, Math.round((365 * 24) / sessions));
    for (const m of MISSIONS)
      if (s.totalProduced >= m.target && !s.claimed.includes(m.id))
        s = applyAction(s, { type: "mission", id: m.id });
    for (const p of s.plants)
      if (p.condition < 70 && s.cash >= repairCost(p) && s.day >= p.repairUntil)
        s = applyAction(s, { type: "repair", id: p.id });
    if (
      s.highest < 6 &&
      projectProgress(s).ready &&
      !s.grants.includes(s.highest)
    )
      s = applyAction(s, { type: "grant" });
    if (s.unlocked > s.highest && s.cash >= TIERS[s.unlocked].cost) {
      s = applyAction(s, { type: "buy", tier: s.unlocked });
      milestones.push(`${TIERS[s.highest].id}: ${(i / sessions).toFixed(1)}d`);
    }
    if (s.highest === 3 && sessions === 3) {
      s.lastAt = Date.now();
      writeFileSync(fixturePath("established"), JSON.stringify(s));
    }
    if (
      s.highest === 6 &&
      s.decommission === 0 &&
      s.cash >= TIERS[6].cost * 0.01
    )
      s = applyAction(s, { type: "decommission" });
    if (s.won) {
      complete = i / sessions;
      if (sessions === 3) {
        s.lastAt = Date.now();
        writeFileSync(fixturePath("nuclear"), JSON.stringify(s));
      }
      break;
    }
  }
  console.log(
    `${sessions} sessions/day: ${complete} real days; ${milestones.join(", ")}`,
  );
  if (complete < 15 || complete > 30) process.exitCode = 1;
}
const early = simulateHours(initialGame("แดดดี เอเนอร์จี"), 24 * 10);
early.lastAt = Date.now();
writeFileSync(fixturePath("early"), JSON.stringify(early));
