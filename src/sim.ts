/** All time is in game days; cash in THB, power in kW, energy in kWh.
 * Fictional grants compress a decades-long capital journey; tariffs are game values. */
export const DAY_MS = 86_400_000;
export const GAME_DAYS_PER_REAL_DAY = 365;
export const PEDAL_INTERVAL_MS = 250;
export const PEDAL_KW = 0.15;
export const PEDAL_KWH =
  PEDAL_KW * (PEDAL_INTERVAL_MS / 3_600_000) * GAME_DAYS_PER_REAL_DAY;
export const OFFLINE_CAP_MS = DAY_MS;
export const VERSION = 1;
export const TIERS = [
  {
    id: "starter",
    name: "โซลาร์หลังบ้าน",
    short: "แผงแรก",
    kw: 0.4,
    cost: 3500,
    cf: 0.18,
    opex: 0.12,
    years: 0.12,
    life: 20,
    wear: 6,
    description: "แผงเล็ก ๆ บนหลังคา จุดเริ่มต้นของทุกอย่าง",
    color: "#4da3ea",
  },
  {
    id: "roof",
    name: "โซลาร์หลังคา",
    short: "หลังคาชุมชน",
    kw: 3,
    cost: 75000,
    cf: 0.18,
    opex: 0.12,
    years: 2,
    life: 25,
    wear: 6,
    description: "ขยายไปบนหลังคาชุมชน ลงทุนกับแดดที่มีทุกวัน",
    color: "#4da3ea",
  },
  {
    id: "community",
    name: "โซลาร์ชุมชน",
    short: "พลังชุมชน",
    kw: 30,
    cost: 650000,
    cf: 0.18,
    opex: 0.12,
    years: 2.4,
    life: 25,
    wear: 6,
    description: "แผงหลายแถว พร้อมระบบส่งออกที่ใหญ่ขึ้น",
    color: "#45bb74",
  },
  {
    id: "farm",
    name: "โซลาร์ฟาร์ม",
    short: "ฟาร์มแสงแดด",
    kw: 300,
    cost: 6000000,
    cf: 0.19,
    opex: 0.12,
    years: 3,
    life: 25,
    wear: 6,
    description: "เปลี่ยนพื้นที่ว่างให้กลายเป็นแหล่งพลังงาน",
    color: "#ffcc48",
  },
  {
    id: "wind",
    name: "ฟาร์มกังหันลม",
    short: "สายลมใหม่",
    kw: 2000,
    cost: 110000000,
    cf: 0.28,
    opex: 0.3,
    years: 3.5,
    life: 25,
    wear: 10,
    description: "กระจายความเสี่ยง ผลิตได้แม้ไม่มีแสงแดด",
    color: "#66bcb0",
  },
  {
    id: "gas",
    name: "โรงไฟฟ้าก๊าซ",
    short: "พลังงานมั่นคง",
    kw: 20000,
    cost: 700000000,
    cf: 0.65,
    opex: 2.3,
    years: 4,
    life: 30,
    wear: 12,
    description: "ควบคุมการผลิตได้ แต่ต้องระวังต้นทุนเชื้อเพลิง",
    color: "#ff7c5e",
  },
  {
    id: "nuclear",
    name: "โรงไฟฟ้านิวเคลียร์",
    short: "บทใหม่ของพลังงาน",
    kw: 300000,
    cost: 60000000000,
    cf: 0.85,
    opex: 1.1,
    years: 2,
    life: 60,
    wear: 5,
    description: "โครงการสุดท้าย ต้องรักษาความพร้อมและกันเงินปลดระวาง",
    color: "#b6a0e3",
  },
] as const;
/** Small additions share the starter wiring; prices are game balance values. */
export const SMALL_GENERATORS = [
  {
    id: "salvaged50",
    name: "แผงมือสอง 50 W",
    short: "แดดเล็ก ๆ",
    kw: 0.05,
    cost: 250,
    cf: 0.18,
    opex: 0.12,
    life: 10,
    wear: 9,
    condition: 80,
    color: "#4da3ea",
    description: "แผงเก่าสภาพ 80% ต่อกับระบบเดิม ผลิตเองตอนมีแดด",
  },
  {
    id: "salvaged100",
    name: "แผงมือสอง 100 W",
    short: "ต่อเติมแสงแดด",
    kw: 0.1,
    cost: 600,
    cf: 0.18,
    opex: 0.12,
    life: 12,
    wear: 8,
    condition: 85,
    color: "#4da3ea",
    description: "เพิ่มพื้นที่รับแดด สภาพ 85% ไม่ต้องเริ่มโครงการใหญ่",
  },
  {
    id: "breeze",
    name: "กังหันลมมือสอง 200 W",
    short: "สายลมหลังบ้าน",
    kw: 0.2,
    cost: 1200,
    cf: 0.12,
    opex: 0.2,
    life: 12,
    wear: 12,
    condition: 85,
    color: "#66bcb0",
    description: "สภาพ 85% ผลิตได้ทั้งวันและคืนเมื่อมีลม ลมอ่อนจะหยุดหมุน",
  },
] as const;
export type SmallGeneratorId = (typeof SMALL_GENERATORS)[number]["id"];
export function plantSpec(p: Plant) {
  return p.equipment
    ? SMALL_GENERATORS.find((item) => item.id === p.equipment)!
    : TIERS[p.tier];
}
/** Site wind in m/s; independent of daylight, deterministic for offline parity. */
export function windSpeed(day: number) {
  return Math.max(
    0,
    5.8 + 2.6 * Math.sin(day * 0.7) + 1.4 * Math.sin(day * 3.1),
  );
}
export function smallWindFactor(day: number) {
  const speed = windSpeed(day);
  if (speed < 3 || speed >= 22) return 0;
  return Math.min(1, (speed ** 3 - 3 ** 3) / (11 ** 3 - 3 ** 3));
}
export const STOCKS = [
  {
    id: "SURY",
    name: "สุริยา โซลาร์",
    sector: "พลังงานแสงอาทิตย์",
    base: 24,
    yield: 0.035,
    phase: 0,
  },
  {
    id: "TARA",
    name: "ธารา แบงก์",
    sector: "ธนาคาร",
    base: 36,
    yield: 0.04,
    phase: 2,
  },
  {
    id: "MALI",
    name: "มะลิ สื่อสาร",
    sector: "โทรคมนาคม",
    base: 18,
    yield: 0.03,
    phase: 4,
  },
  {
    id: "RUNG",
    name: "รุ่งเรือง อุตสาหกรรม",
    sector: "อุตสาหกรรม",
    base: 42,
    yield: 0.025,
    phase: 6,
  },
];
export type Plant = {
  equipment?: SmallGeneratorId;
  id: number;
  tier: number;
  condition: number;
  age: number;
  createdDay: number;
  produced: number;
  sold: number;
  repairUntil: number;
  grid: boolean;
  battery: number;
  stored: number;
  book: number;
  cost: number;
};
export type Entry = {
  id: number;
  day: number;
  label: string;
  kind: string;
  cash: number;
  profit: number;
};
export type Loan = { principal: number; rate: number };
export type Game = {
  version: 1;
  name: string;
  startedAt: number;
  lastAt: number;
  day: number;
  cash: number;
  plants: Plant[];
  highest: number;
  unlocked: number;
  claimed: number[];
  grants: number[];
  holdings: Record<string, { qty: number; cost: number }>;
  dividends: number;
  realized: number;
  loans: Loan[];
  ledger: Entry[];
  totalProduced: number;
  totalSold: number;
  revenue: number;
  expenses: number;
  tax: number;
  reserve: number;
  decommission: number;
  monthRevenue: number;
  monthExpense: number;
  monthDep: number;
  monthInterest: number;
  monthDividend: number;
  monthTrading: number;
  lastMonth: {
    revenue: number;
    expense: number;
    depreciation: number;
    interest: number;
    tax: number;
    profit: number;
  };
  todayEnergy: number;
  todayRevenue: number;
  todayExpense: number;
  yesterdayEnergy: number;
  history: { day: number; revenue: number; expense: number }[];
  contract: "fixed" | "peak";
  autoRepair: boolean;
  reducedMotion: boolean;
  nuclearDays: number;
  won: boolean;
  nextId: number;
  notification: string;
  lastDividendQuarter: number;
  pedalLastAt?: number;
};
export function initialGame(name = "แดดดี เอเนอร์จี", now = Date.now()): Game {
  return {
    version: 1,
    name: name.trim().slice(0, 40) || "แดดดี เอเนอร์จี",
    startedAt: now,
    lastAt: now,
    day: 0.375,
    cash: 0,
    plants: [
      {
        id: 1,
        tier: 0,
        condition: 100,
        age: 0,
        createdDay: 0.375,
        produced: 0,
        sold: 0,
        repairUntil: 0,
        grid: false,
        battery: 0.2,
        stored: 0,
        book: 3500,
        cost: 3500,
      },
    ],
    highest: 0,
    unlocked: 0,
    claimed: [],
    grants: [],
    holdings: {},
    dividends: 0,
    realized: 0,
    loans: [],
    ledger: [],
    totalProduced: 0,
    totalSold: 0,
    revenue: 0,
    expenses: 0,
    tax: 0,
    reserve: 300,
    decommission: 0,
    monthRevenue: 0,
    monthExpense: 0,
    monthDep: 0,
    monthInterest: 0,
    monthDividend: 0,
    monthTrading: 0,
    lastMonth: {
      revenue: 0,
      expense: 0,
      depreciation: 0,
      interest: 0,
      tax: 0,
      profit: 0,
    },
    todayEnergy: 0,
    todayRevenue: 0,
    todayExpense: 0,
    yesterdayEnergy: 0,
    history: [],
    contract: "fixed",
    autoRepair: false,
    reducedMotion: false,
    nuclearDays: 0,
    won: false,
    nextId: 2,
    notification: "ยินดีต้อนรับเจ้าของกิจการคนใหม่!",
    lastDividendQuarter: 0,
  };
}
const copy = (s: Game): Game => structuredClone(s);
function post(s: Game, label: string, kind: string, cash: number, profit = 0) {
  s.cash += cash;
  s.ledger.unshift({ id: s.nextId++, day: s.day, label, kind, cash, profit });
  s.ledger = s.ledger.slice(0, 160);
}
export function weather(day: number) {
  const d = Math.floor(day);
  const season = Math.sin((d / 365) * Math.PI * 2);
  return {
    factor: Math.max(0.45, 0.84 + 0.17 * season + 0.13 * Math.sin(d * 1.73)),
    rain: Math.sin(d * 1.73) < -0.55,
    label: Math.sin(d * 1.73) < -0.55 ? "ฝนบางช่วง" : "แดดดี",
    temp: Math.round(30 + 4 * season),
  };
}
export function plantPower(p: Plant, day: number) {
  if (day < p.repairUntil || p.condition < 20) return 0;
  const t = plantSpec(p),
    hour = (day % 1) * 24;
  let factor: number;
  if (p.equipment === "breeze") factor = smallWindFactor(day);
  else if (p.tier <= 3) {
    const daylight = Math.max(0, Math.sin(((hour - 6) * Math.PI) / 12));
    factor = daylight * (t.cf * Math.PI) * weather(day).factor;
  } else if (p.tier === 4) factor = t.cf * (0.9 + 0.45 * Math.sin(day * 0.7));
  else factor = t.cf;
  return (
    t.kw *
    Math.max(0, factor) *
    (0.65 + (0.35 * p.condition) / 100) *
    Math.max(0.65, 1 - (p.age / 365) * 0.004)
  );
}
export function priceAt(s: Game, day: number) {
  const h = (day % 1) * 24;
  return s.contract === "fixed" ? 3.2 : h >= 18 && h < 22 ? 5.2 : 2.65;
}
export function stockPrice(id: string, day: number) {
  const t = STOCKS.find((x) => x.id === id)!;
  return (
    Math.round(
      t.base *
        Math.max(
          0.45,
          1 +
            0.13 * Math.sin(day / 85 + t.phase) +
            0.05 * Math.sin(day / 17 + t.phase) +
            0.000025 * day,
        ) *
        100,
    ) / 100
  );
}
export function portfolioValue(s: Game) {
  return Object.entries(s.holdings).reduce(
    (sum, [id, h]) => sum + h.qty * stockPrice(id, s.day),
    0,
  );
}
export function capacity(s: Game) {
  return s.plants.reduce((sum, p) => sum + plantSpec(p).kw, 0);
}
export function totalDebt(s: Game) {
  return s.loans.reduce((v, l) => v + l.principal, 0);
}
export function estimatedDaily(s: Game) {
  return s.plants.reduce((a, p) => {
    const t = plantSpec(p);
    return a + t.kw * 24 * t.cf * (0.65 + (0.35 * p.condition) / 100) * 0.84;
  }, 0);
}
export function repairCost(p: Plant) {
  return Math.max(
    p.equipment ? 40 : 150,
    Math.round(plantSpec(p).cost * 0.004),
  );
}
export function gridCost(p: Plant) {
  return Math.round(plantSpec(p).cost * 0.035);
}
export function batteryCost(p: Plant) {
  return Math.round(Math.max(1200, plantSpec(p).kw * 2 * 6500));
}
export function projectProgress(s: Game) {
  const p = s.plants.find((x) => x.tier === s.highest && !x.equipment)!;
  const t = TIERS[p.tier];
  const target = t.kw * 24 * t.cf * 0.78 * t.years * 365;
  return {
    energy: Math.min(1, p.produced / target),
    time: Math.min(1, (s.day - p.createdDay) / (t.years * 365)),
    condition: p.condition >= 60,
    target,
    ready:
      s.day - p.createdDay >= t.years * 365 &&
      p.produced >= target &&
      p.condition >= 60,
  };
}
export function projectGrant(s: Game) {
  return TIERS[Math.min(6, s.highest + 1)].cost * 1.12;
}
function settleDay(s: Game) {
  const energy = s.todayEnergy;
  s.yesterdayEnergy = energy;
  s.todayEnergy = 0;
  s.todayRevenue = 0;
  s.todayExpense = 0;
  const quarter = Math.floor(s.day / 90);
  if (quarter > s.lastDividendQuarter) {
    s.lastDividendQuarter = quarter;
    for (const stock of STOCKS) {
      const h = s.holdings[stock.id];
      if (!h?.qty) continue;
      const per =
        ((stock.base * stock.yield) / 4) *
        (0.7 + 0.3 * Math.sin(quarter + stock.phase));
      const amount = h.qty * Math.max(0, per);
      s.dividends += amount;
      s.monthDividend += amount;
      post(s, "ปันผล " + stock.id, "dividend", amount, amount);
    }
  }
  if (Math.floor(s.day) % 30 === 0) {
    const interest = s.loans.reduce(
      (sum, l) => sum + (l.principal * l.rate) / 12,
      0,
    );
    s.monthInterest = interest;
    if (interest) {
      s.expenses += interest;
      post(s, "ดอกเบี้ยเงินกู้", "interest", -interest, -interest);
    }
    let principal = 0;
    for (const l of s.loans) {
      const pay = Math.min(l.principal, l.principal / 60 + 100);
      l.principal -= pay;
      principal += pay;
    }
    if (principal) post(s, "คืนเงินต้นตามงวด", "principal", -principal);
    const profit =
      s.monthRevenue +
      s.monthDividend +
      s.monthTrading -
      s.monthExpense -
      s.monthDep -
      interest;
    const tax = Math.max(0, profit * 0.2);
    s.tax += tax;
    if (tax) post(s, "ภาษีตัวอย่าง 20% ของกำไรงวด", "tax", -tax, -tax);
    s.lastMonth = {
      revenue: s.monthRevenue + s.monthDividend + s.monthTrading,
      expense: s.monthExpense,
      depreciation: s.monthDep,
      interest,
      tax,
      profit: profit - tax,
    };
    s.history.push({
      day: s.day,
      revenue: s.monthRevenue,
      expense: s.monthExpense + interest + tax,
    });
    s.history = s.history.slice(-12);
    s.monthRevenue = 0;
    s.monthExpense = 0;
    s.monthDep = 0;
    s.monthDividend = 0;
    s.monthTrading = 0;
  }
  if (s.cash < 0)
    s.notification = "เงินสดขาดมือ ลองขายหุ้น ชะลอการขยาย หรือใช้สินเชื่อ";
  if (s.autoRepair)
    for (const p of s.plants) {
      if (
        p.condition < 65 &&
        s.day >= p.repairUntil &&
        s.cash - repairCost(p) >= s.reserve
      ) {
        const cost = repairCost(p);
        post(s, "บำรุงรักษาอัตโนมัติ", "repair", -cost, -cost);
        s.monthExpense += cost;
        s.expenses += cost;
        p.condition = Math.min(96, p.condition + 24);
        p.repairUntil = s.day + 2;
      }
    }
  const n = s.plants.find((p) => p.tier === 6);
  if (n && s.day >= n.repairUntil && n.condition >= 70 && s.cash >= 0)
    s.nuclearDays++;
  if (
    !s.won &&
    s.nuclearDays >= 365 &&
    s.decommission >= TIERS[6].cost * 0.01 &&
    s.lastMonth.profit > 0
  ) {
    s.won = true;
    s.notification = "สำเร็จแล้ว! จากแผงแรกสู่นิวเคลียร์ที่ยั่งยืน";
  }
}
/** Hour-aligned integration makes foreground/offline outcomes equal. Fractional time is retained by advanceTo. */
export function simulateHours(state: Game, hours: number): Game {
  const s = copy(state);
  if (!Number.isInteger(hours) || hours < 0 || hours > 24 * 365 * 2)
    throw Error("Invalid simulation duration");
  for (let i = 0; i < hours; i++) {
    const mid = s.day + 1 / 48;
    let revenue = 0,
      opex = 0,
      energy = 0;
    for (const p of s.plants) {
      const t = plantSpec(p);
      const generation = plantPower(p, mid);
      p.age += 1 / 24;
      p.condition = Math.max(0, p.condition - t.wear / 365 / 24);
      p.produced += generation;
      energy += generation;
      const limit = t.kw * (p.grid ? 1 : 0.5);
      // Aged batteries retain less capacity; charging/discharging both lose 8%.
      const usableCapacity =
        p.battery * Math.max(0.6, 1 - (p.age / 365) * 0.025);
      p.stored = Math.min(p.stored, usableCapacity);
      let available = generation;
      if (
        s.contract === "peak" &&
        priceAt(s, mid) < 4 &&
        mid >= p.repairUntil
      ) {
        const charge = Math.min(
          available,
          Math.max(0, usableCapacity - p.stored),
          p.battery * 0.5,
        );
        p.stored += charge * 0.92;
        available -= charge;
      }
      let sold = Math.min(available, limit),
        extra = Math.max(0, available - limit);
      const canDischarge =
        p.stored > 0 && (s.contract === "fixed" || priceAt(s, mid) > 4);
      if (canDischarge && mid >= p.repairUntil) {
        const discharge = Math.min(
          p.stored,
          Math.max(0, limit - sold),
          p.battery * 0.5,
        );
        sold += discharge * 0.92;
        p.stored -= discharge;
      }
      const stored = Math.min(
        extra,
        Math.max(0, usableCapacity - p.stored),
        p.battery * 0.5,
      );
      p.stored += stored * 0.92;
      p.sold += sold;
      const income = sold * priceAt(s, mid);
      revenue += income;
      opex += generation * t.opex + (t.cost * 0.0015) / 365 / 24;
      const dep = Math.min(p.book, p.cost / t.life / 365 / 24);
      p.book -= dep;
      s.monthDep += dep;
    }
    s.day = Math.round((s.day + 1 / 24) * 24) / 24;
    s.totalProduced += energy;
    s.totalSold += revenue / priceAt(s, mid);
    s.todayEnergy += energy;
    s.todayRevenue += revenue;
    s.todayExpense += opex;
    s.revenue += revenue;
    s.monthRevenue += revenue;
    s.monthExpense += opex;
    s.expenses += opex;
    s.cash += revenue - opex;
    if (Math.round(s.day * 24) % 24 === 0) {
      post(s, "ขายไฟและต้นทุนประจำวัน", "operation", 0, 0);
      const e = s.ledger[0];
      e.cash = s.todayRevenue - s.todayExpense;
      e.profit = e.cash;
      settleDay(s);
    }
  }
  return s;
}
export function advanceTo(
  s: Game,
  now = Date.now(),
): { state: Game; elapsed: number; capped: boolean } {
  const delta = Math.max(0, now - s.lastAt);
  const elapsed = Math.min(delta, OFFLINE_CAP_MS);
  const hourMs = DAY_MS / GAME_DAYS_PER_REAL_DAY / 24;
  const hours = Math.floor(elapsed / hourMs + 1e-7);
  if (!hours) return { state: s, elapsed: 0, capped: false };
  const next = simulateHours(s, hours);
  next.lastAt = delta > OFFLINE_CAP_MS ? now : s.lastAt + hours * hourMs;
  return { state: next, elapsed, capped: delta > OFFLINE_CAP_MS };
}
export type Action =
  | { type: "pedal"; at: number }
  | { type: "buy"; tier: number }
  | { type: "buySmall"; equipment: SmallGeneratorId }
  | { type: "repair" | "replace" | "grid" | "battery"; id: number }
  | { type: "grant" }
  | { type: "mission"; id: number }
  | { type: "trade"; stock: string; qty: number; sell: boolean }
  | { type: "loan"; amount: number }
  | { type: "repay" }
  | { type: "contract"; value: "fixed" | "peak" }
  | { type: "policy"; auto: boolean; reserve: number }
  | { type: "decommission" };
export const MISSIONS = [
  {
    id: 0,
    name: "ไฟฟ้าหน่วยแรก",
    desc: "ผลิตไฟฟ้าสะสม 1 kWh",
    target: 1,
    reward: 500,
  },
  {
    id: 3,
    name: "ให้สายลมช่วยทำงาน",
    desc: "ผลิตไฟฟ้าสะสม 5 kWh",
    target: 5,
    reward: 1000,
  },
  {
    id: 1,
    name: "เริ่มมีแสงสว่าง",
    desc: "ผลิตไฟฟ้าสะสม 20 kWh",
    target: 20,
    reward: 2500,
  },
  {
    id: 2,
    name: "พลังเล็ก ๆ ที่เติบโต",
    desc: "ผลิตไฟฟ้าสะสม 200 kWh",
    target: 200,
    reward: 5000,
  },
];
export function applyAction(state: Game, a: Action): Game {
  const s = copy(state);
  const pay = (cost: number, label: string, kind = "capex") => {
    if (!Number.isFinite(cost) || cost < 0 || s.cash < cost)
      throw Error("เงินสดไม่พอสำหรับรายการนี้");
    post(s, label, kind, -cost, kind === "repair" ? -cost : 0);
  };
  if (a.type === "pedal") {
    if (!Number.isFinite(a.at) || a.at < s.startedAt)
      throw Error("เวลาปั่นไฟไม่ถูกต้อง");
    if (s.pedalLastAt !== undefined && a.at - s.pedalLastAt < PEDAL_INTERVAL_MS)
      return s;
    s.pedalLastAt = a.at;
    const income = PEDAL_KWH * priceAt(s, s.day);
    s.totalProduced += PEDAL_KWH;
    s.totalSold += PEDAL_KWH;
    s.todayEnergy += PEDAL_KWH;
    s.todayRevenue += income;
    s.revenue += income;
    s.monthRevenue += income;
    // The daily operation entry posts these sales once, alongside solar sales.
    s.cash += income;
  } else if (a.type === "buySmall") {
    const t = SMALL_GENERATORS.find((item) => item.id === a.equipment);
    if (!t) throw Error("ไม่พบอุปกรณ์เสริม");
    if (s.plants.length >= 100)
      throw Error("พื้นที่โครงการเต็มแล้ว (100 แห่ง)");
    pay(t.cost, "ซื้อ " + t.name);
    s.plants.push({
      id: s.nextId++,
      tier: 0,
      equipment: t.id,
      condition: t.condition,
      age: 0,
      createdDay: s.day,
      produced: 0,
      sold: 0,
      repairUntil: s.day + 0.25,
      grid: true,
      battery: 0,
      stored: 0,
      book: t.cost,
      cost: t.cost,
    });
  } else if (a.type === "buy") {
    if (s.plants.length >= 100)
      throw Error("พื้นที่โครงการเต็มแล้ว (100 แห่ง)");
    if (!Number.isInteger(a.tier) || a.tier < 0 || a.tier > s.unlocked)
      throw Error("ยังไม่ปลดล็อกโครงการนี้");
    const t = TIERS[a.tier];
    if (s.plants.some((p) => p.tier === a.tier && !p.equipment) && a.tier > 0)
      throw Error("มีโครงการนี้แล้ว");
    pay(t.cost, "ซื้อ " + t.name);
    s.plants.push({
      id: s.nextId++,
      tier: a.tier,
      condition: 100,
      age: 0,
      createdDay: s.day,
      produced: 0,
      sold: 0,
      repairUntil: s.day + (a.tier === 6 ? 90 : a.tier >= 4 ? 30 : 2),
      grid: false,
      battery: 0,
      stored: 0,
      book: t.cost,
      cost: t.cost,
    });
    s.highest = Math.max(s.highest, a.tier);
  } else if (
    a.type === "repair" ||
    a.type === "replace" ||
    a.type === "grid" ||
    a.type === "battery"
  ) {
    const p = s.plants.find((x) => x.id === a.id);
    if (!p) throw Error("ไม่พบอุปกรณ์");
    if (s.day < p.repairUntil) throw Error("อุปกรณ์กำลังซ่อมหรือก่อสร้าง");
    const t = plantSpec(p);
    if (a.type === "repair") {
      if (p.condition >= 96) throw Error("อุปกรณ์ยังอยู่ในสภาพดี");
      const c = repairCost(p);
      pay(c, "ซ่อมบำรุง " + t.name, "repair");
      s.monthExpense += c;
      s.expenses += c;
      p.condition = Math.min(96, p.condition + 24);
      p.repairUntil = s.day + 2;
    }
    if (a.type === "replace") {
      const disposalLoss = p.book - p.cost * 0.1;
      pay(p.cost * 0.9, "เปลี่ยนอุปกรณ์ " + t.name);
      // Sale proceeds are netted against cash paid, not against the new asset's cost.
      post(s, "ผลจำหน่ายอุปกรณ์เดิม", "disposal", 0, -disposalLoss);
      s.monthExpense += disposalLoss;
      p.condition = 100;
      p.age = 0;
      p.book = p.cost;
      p.stored = 0;
      p.repairUntil = s.day + 5;
    }
    if (a.type === "grid") {
      if (p.grid) throw Error("ขยายโครงข่ายแล้ว");
      const cost = gridCost(p);
      pay(cost, "ขยายสิทธิส่งออก " + t.name);
      p.cost += cost;
      p.book += cost;
      p.grid = true;
    }
    if (a.type === "battery") {
      if (p.battery >= t.kw * 2) throw Error("ติดตั้งแบตเตอรี่เต็มพื้นที่แล้ว");
      const cost = batteryCost(p);
      pay(cost, "ติดตั้งแบตเตอรี่");
      p.cost += cost;
      p.book += cost;
      p.battery = t.kw * 2;
    }
  } else if (a.type === "grant") {
    if (
      s.highest >= 6 ||
      s.grants.includes(s.highest) ||
      !projectProgress(s).ready
    )
      throw Error("ยังไม่ผ่านเงื่อนไขโครงการ");
    post(s, "ทุนเปลี่ยนผ่านพลังงาน (สมมติ)", "grant", projectGrant(s));
    s.grants.push(s.highest);
    s.unlocked = s.highest + 1;
  } else if (a.type === "mission") {
    const m = MISSIONS.find((m) => m.id === a.id);
    if (!m || s.claimed.includes(a.id) || s.totalProduced < m.target)
      throw Error("ยังรับรางวัลไม่ได้");
    post(s, "ทุนเริ่มต้น: " + m.name, "grant", m.reward);
    s.claimed.push(a.id);
  } else if (a.type === "trade") {
    if (
      !STOCKS.some((x) => x.id === a.stock) ||
      !Number.isInteger(a.qty) ||
      a.qty <= 0
    )
      throw Error("จำนวนหุ้นต้องเป็นจำนวนเต็มมากกว่า 0");
    const price = stockPrice(a.stock, s.day);
    const gross = price * a.qty;
    const fee = gross * 0.0025;
    const h = s.holdings[a.stock] ?? { qty: 0, cost: 0 };
    if (a.sell) {
      if (h.qty < a.qty) throw Error("จำนวนหุ้นไม่พอขาย");
      const basis = (h.cost / h.qty) * a.qty;
      const gain = gross - fee - basis;
      post(s, "ขาย " + a.stock, "trade", gross - fee, gain);
      h.qty -= a.qty;
      h.cost -= basis;
      s.realized += gain;
      s.monthTrading += gain;
    } else {
      pay(gross + fee, "ซื้อ " + a.stock, "trade");
      h.qty += a.qty;
      h.cost += gross + fee;
    }
    s.holdings[a.stock] = h;
  } else if (a.type === "loan") {
    const max = Math.max(
      10000,
      s.plants.reduce((v, p) => v + p.book, 0) * 0.25,
    );
    if (
      !Number.isFinite(a.amount) ||
      a.amount <= 0 ||
      a.amount + totalDebt(s) > max
    )
      throw Error("เกินวงเงินสินเชื่อ");
    s.loans.push({ principal: a.amount, rate: 0.075 });
    post(s, "รับเงินกู้", "loan", a.amount);
  } else if (a.type === "repay") {
    const amount = totalDebt(s);
    if (amount <= 0) throw Error("ไม่มีหนี้คงเหลือ");
    pay(amount, "คืนเงินต้นทั้งหมด", "principal");
    s.loans = [];
  } else if (a.type === "contract") {
    s.contract = a.value;
  } else if (a.type === "policy") {
    if (!Number.isFinite(a.reserve) || a.reserve < 0)
      throw Error("เงินสำรองไม่ถูกต้อง");
    s.autoRepair = a.auto;
    s.reserve = a.reserve;
  } else if (a.type === "decommission") {
    if (s.highest < 6) throw Error("ยังไม่มีโครงการนิวเคลียร์");
    const amount = TIERS[6].cost * 0.01 - s.decommission;
    if (amount <= 0) throw Error("กันเงินครบแล้ว");
    pay(amount, "เงินกันไว้ปลดระวาง", "reserve");
    s.decommission += amount;
  }
  return s;
}
export const SAVE_KEY = "denki.factory.v1";
export function validateSave(value: unknown): value is Game {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const s = value as Game,
      template = initialGame("", 0);
    for (const key of Object.keys(template) as (keyof Game)[]) {
      const v = s[key],
        ref = template[key];
      if (
        typeof ref === "number" &&
        (!Number.isFinite(v) || typeof v !== "number")
      )
        return false;
      if (typeof ref === "string" && typeof v !== "string") return false;
      if (typeof ref === "boolean" && typeof v !== "boolean") return false;
      if (Array.isArray(ref) && !Array.isArray(v)) return false;
    }
    const finiteFields = (obj: object, keys: string[]) =>
      keys.every((k) => Number.isFinite((obj as Record<string, unknown>)[k]));
    return (
      s.version === 1 &&
      (s.pedalLastAt === undefined ||
        (Number.isFinite(s.pedalLastAt) && s.pedalLastAt >= s.startedAt)) &&
      s.name.length <= 40 &&
      s.day >= 0 &&
      s.day < 365 * 1000 &&
      s.plants.length > 0 &&
      s.plants.length <= 500 &&
      s.plants.every(
        (p) =>
          finiteFields(p, [
            "id",
            "tier",
            "condition",
            "age",
            "createdDay",
            "produced",
            "sold",
            "repairUntil",
            "battery",
            "stored",
            "book",
            "cost",
          ]) &&
          (p.equipment === undefined ||
            (p.tier === 0 &&
              SMALL_GENERATORS.some((item) => item.id === p.equipment))) &&
          Number.isInteger(p.tier) &&
          p.tier >= 0 &&
          p.tier < TIERS.length &&
          p.condition >= 0 &&
          p.condition <= 100 &&
          p.age >= 0 &&
          p.book >= 0 &&
          p.stored >= 0 &&
          p.stored <= p.battery &&
          typeof p.grid === "boolean",
      ) &&
      s.ledger.length <= 160 &&
      s.ledger.every(
        (e) =>
          typeof e.label === "string" &&
          typeof e.kind === "string" &&
          finiteFields(e, ["day", "cash", "profit", "id"]),
      ) &&
      s.loans.every(
        (l) =>
          finiteFields(l, ["principal", "rate"]) &&
          l.principal >= 0 &&
          l.rate >= 0 &&
          l.rate <= 1,
      ) &&
      s.history.every((h) => finiteFields(h, ["day", "revenue", "expense"])) &&
      s.claimed.every(Number.isInteger) &&
      s.grants.every(Number.isInteger) &&
      Number.isInteger(s.highest) &&
      s.highest >= 0 &&
      s.highest < 7 &&
      Number.isInteger(s.unlocked) &&
      s.unlocked >= s.highest &&
      s.unlocked < 7 &&
      s.plants.some((p) => p.tier === s.highest && !p.equipment) &&
      typeof s.holdings === "object" &&
      s.holdings !== null &&
      !Array.isArray(s.holdings) &&
      Object.entries(s.holdings).every(
        ([id, h]) =>
          STOCKS.some((x) => x.id === id) &&
          finiteFields(h, ["qty", "cost"]) &&
          Number.isInteger(h.qty) &&
          h.qty >= 0 &&
          h.cost >= -0.00001,
      ) &&
      finiteFields(s.lastMonth, [
        "revenue",
        "expense",
        "depreciation",
        "interest",
        "tax",
        "profit",
      ]) &&
      (s.contract === "fixed" || s.contract === "peak")
    );
  } catch {
    return false;
  }
}
