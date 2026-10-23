import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialGame,
  capacity,
  windSpeed,
  SMALL_GENERATORS,
  simulateHours,
  applyAction,
  advanceTo,
  plantPower,
  TIERS,
  GAME_DAYS_PER_REAL_DAY,
  DAY_MS,
  portfolioValue,
  stockPrice,
  repairCost,
  validateSave,
  projectProgress,
  MISSIONS,
  PEDAL_KWH,
  PEDAL_INTERVAL_MS,
} from "../src/sim.ts";
const close = (a: number, b: number, eps = 0.00001) =>
  assert.ok(Math.abs(a - b) < eps, `${a} differs from ${b}`);
test("pedaling sells metered energy at night without changing solar output or assets", () => {
  const start = initialGame("bike", 0);
  start.day = 0;
  const s = applyAction(start, { type: "pedal", at: 0 });
  close(s.totalProduced, PEDAL_KWH);
  close(s.totalSold, PEDAL_KWH);
  close(s.cash, PEDAL_KWH * 3.2);
  close(s.revenue, s.cash);
  close(s.monthRevenue, s.cash);
  close(s.todayRevenue, s.cash);
  close(s.todayEnergy, PEDAL_KWH);
  assert.deepEqual(s.plants, start.plants);
  assert.equal(start.cash, 0);
});
test("pedaling rate is bounded across repeated events and restored saves", () => {
  let s = applyAction(initialGame("bike", 0), { type: "pedal", at: 0 });
  for (let i = 0; i < 50; i++) s = applyAction(s, { type: "pedal", at: 100 });
  close(s.totalProduced, PEDAL_KWH);
  s = JSON.parse(JSON.stringify(s));
  assert.ok(validateSave(s));
  s = applyAction(s, { type: "pedal", at: PEDAL_INTERVAL_MS });
  close(s.totalProduced, 2 * PEDAL_KWH);
  assert.throws(() => applyAction(s, { type: "pedal", at: NaN }));
  assert.throws(() => applyAction(s, { type: "pedal", at: -1 }));
  assert.ok(!validateSave({ ...s, pedalLastAt: "bad" }));
  assert.ok(validateSave(initialGame("old save", 0)));
});
test("bike sales use the current tariff and reconcile once in daily cash flow", () => {
  let s = initialGame("bike", 0);
  s.contract = "peak";
  s.day = 19 / 24;
  s = applyAction(s, { type: "pedal", at: 0 });
  close(s.cash, PEDAL_KWH * 5.2);
  s = simulateHours(s, 24);
  close(s.cash, s.revenue - s.expenses);
  close(
    s.ledger.reduce((sum, entry) => sum + entry.cash, 0) +
      s.todayRevenue -
      s.todayExpense,
    s.cash,
  );
  close(s.totalSold, s.totalProduced - s.plants[0].produced + s.plants[0].sold);
});
test("starts at zero with gifted solar and small battery; no employees", () => {
  const s = initialGame("test", 0);
  assert.equal(s.cash, 0);
  assert.equal(s.plants[0].battery, 0.2);
  assert.equal(TIERS[s.plants[0].tier].kw, 0.4);
  assert.ok(!("staff" in s));
});
test("solar produces zero at night and positive at noon", () => {
  const p = initialGame().plants[0];
  assert.equal(plantPower(p, 0), 0);
  assert.ok(plantPower(p, 0.5) > 0);
});
test("energy and cash reconcile over one day, using correct units", () => {
  const start = initialGame();
  const s = simulateHours(start, 24);
  assert.ok(s.totalProduced > 0 && s.totalProduced < 0.4 * 24);
  close(s.revenue, s.totalSold * 3.2);
  close(s.cash, s.revenue - s.expenses);
  close(
    s.ledger.reduce((v, e) => v + e.cash, 0) + s.todayRevenue - s.todayExpense,
    s.cash,
  );
  assert.ok(s.plants[0].book < start.plants[0].book);
});
test("offline and foreground advance identically; cap is 24 real hours", () => {
  let s = initialGame("test", 0);
  const once = advanceTo(s, 7200000).state;
  for (let i = 1; i <= 120; i++) s = advanceTo(s, i * 60000).state;
  close(s.day, once.day);
  close(s.cash, once.cash, 0.001);
  const capped = advanceTo(initialGame("test", 0), DAY_MS * 4);
  assert.equal(capped.capped, true);
  close(capped.state.day, GAME_DAYS_PER_REAL_DAY + initialGame().day);
  assert.equal(capped.state.lastAt, DAY_MS * 4);
});
test("repeated reload cannot duplicate offline income", () => {
  const s = advanceTo(initialGame("test", 0), 3600000).state;
  const next = advanceTo(s, 3600000).state;
  assert.deepEqual(next, s);
});
test("repair improves condition but does not reset age or book; stops output", () => {
  const s = initialGame();
  s.cash = 1000;
  s.plants[0].condition = 58;
  s.plants[0].age = 900;
  const a = applyAction(s, { type: "repair", id: 1 });
  assert.equal(a.plants[0].condition, 82);
  assert.equal(a.plants[0].age, 900);
  assert.equal(a.plants[0].book, s.plants[0].book);
  close(a.cash, 1000 - repairCost(s.plants[0]));
  assert.equal(plantPower(a.plants[0], 0.5), 0);
});
test("frozen input state is not mutated by simulations or actions", () => {
  const s = initialGame();
  const raw = JSON.stringify(s);
  simulateHours(s, 24);
  assert.equal(JSON.stringify(s), raw);
  assert.throws(() => applyAction(s, { type: "buy", tier: 1 }));
  assert.equal(JSON.stringify(s), raw);
});
test("grants and missions cannot be claimed twice", () => {
  let s = initialGame();
  s.totalProduced = 2;
  s = applyAction(s, { type: "mission", id: 0 });
  assert.equal(s.cash, 500);
  assert.throws(() => applyAction(s, { type: "mission", id: 0 }));
  assert.throws(() => applyAction(s, { type: "grant" }));
  assert.throws(() => applyAction(s, { type: "buy", tier: 6 }));
});
test("stock trades include fees and preserve cost basis on partial sale", () => {
  let s = initialGame();
  s.cash = 10000;
  const price = stockPrice("SURY", s.day);
  s = applyAction(s, { type: "trade", stock: "SURY", qty: 100, sell: false });
  close(s.cash, 10000 - price * 100 * 1.0025);
  close(portfolioValue(s), price * 100);
  s = applyAction(s, { type: "trade", stock: "SURY", qty: 40, sell: true });
  assert.equal(s.holdings.SURY.qty, 60);
  close(s.holdings.SURY.cost, price * 60 * 1.0025);
  close(s.realized, -price * 40 * 0.005);
  assert.throws(() =>
    applyAction(s, { type: "trade", stock: "SURY", qty: 61, sell: true }),
  );
  assert.throws(() =>
    applyAction(s, { type: "trade", stock: "SURY", qty: 1.5, sell: false }),
  );
});
test("loans increase cash but not revenue; monthly debt service reduces principal", () => {
  let s = initialGame();
  s = applyAction(s, { type: "loan", amount: 5000 });
  assert.equal(s.cash, 5000);
  assert.equal(s.revenue, 0);
  const next = simulateHours(s, 720);
  assert.ok(next.loans[0].principal < 5000);
  assert.equal(next.lastMonth.interest, 31.25);
  assert.equal(next.ledger.find((e) => e.kind === "principal")?.profit, 0);
});
test("battery never creates energy; sales cannot exceed generation plus initial charge", () => {
  let s = initialGame();
  s.cash = 10000;
  s = applyAction(s, { type: "battery", id: 1 });
  s = applyAction(s, { type: "contract", value: "peak" });
  s = simulateHours(s, 240);
  assert.ok(s.totalSold <= s.totalProduced);
  assert.ok(s.plants[0].stored <= s.plants[0].battery);
});
test("only held shares earn dividends, no repeated payment in same quarter", () => {
  let s = initialGame();
  s.cash = 10000;
  s = applyAction(s, { type: "trade", stock: "SURY", qty: 10, sell: false });
  s = simulateHours(s, 90 * 24);
  assert.ok(s.dividends > 0);
  const dividend = s.dividends;
  s = simulateHours(s, 24);
  assert.equal(s.dividends, dividend);
  assert.equal(simulateHours(initialGame(), 90 * 24).dividends, 0);
});
test("negative profit has zero tax; depreciation is not charged as cash", () => {
  let s = initialGame();
  s.plants[0].repairUntil = 40;
  s = simulateHours(s, 720);
  assert.ok(s.lastMonth.profit < 0);
  assert.equal(s.lastMonth.tax, 0);
  close(s.cash, s.revenue - s.expenses);
});
test("malformed saves rejected", () => {
  assert.equal(validateSave({ version: 1 }), false);
  assert.equal(validateSave(initialGame()), true);
  const s = initialGame();
  s.plants[0].tier = 99;
  assert.equal(validateSave(s), false);
});
test("balanced attentive strategy reaches nuclear completion within 15–30 real days", () => {
  let s = initialGame("balance", 0);
  let complete = 0;
  for (let realHours = 1; realHours <= 30 * 24; realHours++) {
    s = simulateHours(s, 365); // one real hour = 365 game hours
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
    if (s.unlocked > s.highest && s.cash >= TIERS[s.unlocked].cost)
      s = applyAction(s, { type: "buy", tier: s.unlocked });
    if (
      s.highest === 6 &&
      s.decommission === 0 &&
      s.cash >= TIERS[6].cost * 0.01
    )
      s = applyAction(s, { type: "decommission" });
    if (s.won) {
      complete = realHours / 24;
      break;
    }
  }
  assert.ok(
    complete >= 15 && complete <= 30,
    `completion at ${complete} days; chapter ${s.highest}, day ${s.day}, cash ${s.cash}`,
  );
  console.log(
    `Attentive balance simulation: ${complete.toFixed(2)} real days to completion`,
  );
});

test("grid investment adds book value; replacement recognizes disposal separately from cash", () => {
  let s = initialGame();
  s.cash = 100000;
  const before = s.plants[0].book;
  s = applyAction(s, { type: "grid", id: 1 });
  assert.ok(s.plants[0].book > before);
  assert.equal(s.monthExpense, 0);
  const original = s.plants[0].cost;
  s.plants[0].book = original * 0.5;
  const cash = s.cash;
  s = applyAction(s, { type: "replace", id: 1 });
  close(s.cash, cash - original * 0.9);
  close(s.plants[0].book, original);
  close(s.monthExpense, original * 0.4);
  assert.equal(s.ledger.find((e) => e.kind === "disposal")?.cash, 0);
});

test("small generators cost cash, preserve chapter progress, and survive old/new save validation", () => {
  const old = initialGame("old", 0);
  assert.ok(validateSave(JSON.parse(JSON.stringify(old))));
  old.cash = 2000;
  let s = applyAction(old, { type: "buySmall", equipment: "salvaged50" });
  s = applyAction(s, { type: "buySmall", equipment: "breeze" });
  close(s.cash, 550);
  close(capacity(s), 0.65);
  assert.equal(s.highest, 0);
  assert.equal(s.plants[1].condition, 80);
  assert.equal(s.plants[2].grid, true);
  assert.deepEqual(projectProgress(s), projectProgress(old));
  assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
  assert.equal(s.monthExpense, 0);
  assert.throws(() =>
    applyAction(initialGame(), { type: "buySmall", equipment: "breeze" }),
  );
  assert.throws(() =>
    applyAction(s, { type: "buySmall", equipment: "unknown" as any }),
  );
  assert.ok(
    !validateSave({
      ...s,
      plants: s.plants.map((p) => ({ ...p, equipment: "unknown" })),
    }),
  );
});

test("small wind follows the wind curve at night, respects rating, maintenance and downtime", () => {
  let s = initialGame();
  s.cash = 1200;
  s = applyAction(s, { type: "buySmall", equipment: "breeze" });
  const p = s.plants[1];
  assert.equal(plantPower(p, s.day), 0); // installation
  let nights = 0,
    calm = 0;
  for (let day = 1; day < 200; day++) {
    const output = plantPower(p, day);
    assert.ok(output >= 0 && output <= 0.2);
    if (windSpeed(day) < 3) {
      close(output, 0);
      calm++;
    }
    if (output > 0) nights++;
    assert.equal(plantPower(s.plants[0], day), 0);
  }
  assert.ok(nights > 0 && calm > 0);
  p.condition = 19;
  close(plantPower(p, 2), 0);
  p.condition = 85;
  p.repairUntil = 10;
  close(plantPower(p, 2), 0);
});

test("mixed small generators reconcile finances, wear, depreciation and offline production", () => {
  let s = initialGame("mixed", 0);
  s.cash = 3000;
  for (const equipment of SMALL_GENERATORS)
    s = applyAction(s, { type: "buySmall", equipment: equipment.id });
  const startingCash = s.cash;
  const next = advanceTo(s, 7200000).state;
  let repeated = s;
  for (let min = 1; min <= 120; min++)
    repeated = advanceTo(repeated, min * 60000).state;
  close(next.cash, repeated.cash);
  close(next.totalProduced, repeated.totalProduced);
  close(next.cash, startingCash + next.revenue - next.expenses - next.tax);
  assert.ok(next.totalSold <= next.totalProduced);
  assert.ok(next.plants[3].produced > 0);
  assert.ok(next.plants[3].condition < 85 && next.plants[3].book < 1200);
  assert.ok(validateSave(next));
});

test("passive start buys a panel and wind in the first hour without a loan or tapping", () => {
  let s = initialGame("onboarding", 0);
  let panelAt = 0,
    windAt = 0;
  for (let minute = 1; minute <= 60; minute++) {
    s = advanceTo(s, minute * 60000).state;
    for (const m of MISSIONS)
      if (s.totalProduced >= m.target && !s.claimed.includes(m.id))
        s = applyAction(s, { type: "mission", id: m.id });
    if (!panelAt && s.cash >= 250) {
      s = applyAction(s, { type: "buySmall", equipment: "salvaged50" });
      panelAt = minute;
    }
    if (!windAt && s.cash >= 1200) {
      s = applyAction(s, { type: "buySmall", equipment: "breeze" });
      windAt = minute;
    }
  }
  assert.ok(panelAt > 0 && panelAt <= 10, `first panel: ${panelAt} minutes`);
  assert.ok(windAt > 0 && windAt <= 60, `first wind: ${windAt} minutes`);
  assert.equal(s.loans.length, 0);
  assert.equal(s.pedalLastAt, undefined);
  assert.ok(s.plants[2].produced > 0);
  console.log(`Passive onboarding: panel ${panelAt} min; wind ${windAt} min`);
});
