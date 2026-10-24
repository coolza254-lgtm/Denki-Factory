import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Zap,
  Sun,
  Moon,
  Wind,
  Atom,
  Flame,
  ArrowUpRight,
  ArrowLeft,
  ChevronRight,
  Settings,
  Bell,
  Flag,
  X,
  Check,
  LockKeyhole,
  Wrench,
  Plus,
  Building2,
  ChartNoAxesCombined,
  Map,
  Wallet,
  Coins,
  Download,
  Upload,
  CircleHelp,
  ShieldCheck,
  Clock3,
  TrendingUp,
  AlertTriangle,
  Banknote,
  Leaf,
  Battery,
  Cable,
  RotateCcw,
} from "lucide-react";
import "@fontsource/mali/thai-600.css";
import "@fontsource/mali/latin-600.css";
import "@fontsource/noto-sans-thai-looped/thai-400.css";
import "@fontsource/noto-sans-thai-looped/thai-600.css";
import "@fontsource/noto-sans-thai-looped/latin-400.css";
import "./style.css";
import { FactoryArt, SolarIcon } from "./Art";
import { SmallGeneratorArt } from "./SmallGeneratorArt";
import { UpdatePanel } from "./UpdatePanel";
import { RollingNumber, ActionCelebration, type Celebration } from "./Motion";
import {
  TIERS,
  SMALL_GENERATORS,
  plantSpec,
  windSpeed,
  STOCKS,
  MISSIONS,
  SAVE_KEY,
  DAY_MS,
  GAME_DAYS_PER_REAL_DAY,
  PEDAL_KWH,
  initialGame,
  validateSave,
  advanceTo,
  applyAction,
  weather,
  plantPower,
  priceAt,
  stockPrice,
  portfolioValue,
  capacity,
  estimatedDaily,
  totalDebt,
  projectProgress,
  projectGrant,
  repairCost,
  gridCost,
  batteryCost,
  type Game,
  type Action,
  type Plant,
} from "./sim";
const money = (v: number, digits = 0) =>
  "฿" +
  v.toLocaleString("th-TH", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
const num = (v: number, d = 1) =>
  v.toLocaleString("th-TH", { maximumFractionDigits: d });
const compact = (v: number) =>
  v >= 1e9
    ? num(v / 1e9, 2) + " พันล้าน"
    : v >= 1e6
      ? num(v / 1e6, 2) + " ล้าน"
      : num(v);
const energy = (v: number) =>
  v >= 1e6
    ? num(v / 1e6) + " GWh"
    : v >= 1e3
      ? num(v / 1e3) + " MWh"
      : num(v, 2) + " kWh";
const power = (v: number) =>
  v >= 1000 ? num(v / 1000) + " MW" : num(v, 2) + " kW";
const date = (day: number) => {
  const dt = new Date(Date.UTC(2026, 0, 1) + day * DAY_MS);
  return dt.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};
function readInitial() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { game: null, error: "" };
    const value = JSON.parse(raw);
    if (!validateSave(value))
      return {
        game: null,
        error: "ไฟล์บันทึกไม่สมบูรณ์ กรุณานำเข้าไฟล์สำรอง หรือเริ่มกิจการใหม่",
      };
    const advanced = advanceTo(value);
    return {
      game: advanced.state,
      error: "",
      offline:
        advanced.elapsed > 60000
          ? {
              elapsed: advanced.elapsed,
              capped: advanced.capped,
              cash: advanced.state.cash - value.cash,
              energy: advanced.state.totalProduced - value.totalProduced,
            }
          : null,
    };
  } catch {
    return {
      game: null,
      error:
        "อ่านบันทึกไม่ได้ ข้อมูลเดิมยังไม่ถูกลบ กรุณานำเข้าสำรองหรือลองเปิดใหม่",
    };
  }
}
const initial = readInitial();
function Icon({ tier }: { tier: number }) {
  return tier === 6 ? (
    <Atom />
  ) : tier === 5 ? (
    <Flame />
  ) : tier === 4 ? (
    <Wind />
  ) : (
    <SolarIcon />
  );
}
function App() {
  const [game, setGame] = useState<Game | null>(initial.game);
  const [pedalPulse, setPedalPulse] = useState(0);
  const live = useRef(game);
  live.current = game;
  const [tab, setTab] = useState("plant"),
    [page, setPage] = useState(""),
    [selected, setSelected] = useState(1),
    [toast, setToast] = useState(""),
    [saveError, setSaveError] = useState(initial.error),
    [company, setCompany] = useState("แดดดี เอเนอร์จี");
  const [modal, setModal] = useState<{
    title: string;
    body: string;
    cost?: number;
    action?: Action;
    custom?: () => void;
    danger?: boolean;
  } | null>(null);
  const [offline, setOffline] = useState(initial.offline),
    [stock, setStock] = useState("SURY"),
    [qty, setQty] = useState(10),
    [sell, setSell] = useState(false),
    [reserve, setReserve] = useState(300),
    [loan, setLoan] = useState(5000);
  const routeFirst = useRef(true);
  const routeRestore = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setGame((old) => (old ? advanceTo(old).state : null));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const save = () => {
      const s = live.current;
      if (s)
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(s));
          setSaveError("");
        } catch {
          setSaveError(
            "บันทึกไม่สำเร็จ พื้นที่อาจเต็ม กรุณาส่งออกสำรองแล้วลองอีกครั้ง",
          );
        }
    };
    const id = setInterval(save, 5000);
    const hide = () => {
      if (document.hidden) save();
      else setGame((s) => (s ? advanceTo(s).state : null));
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", save);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [page, tab]);
  useEffect(() => {
    if (page === "policy") setReserve(live.current?.reserve ?? 300);
  }, [page]);
  useEffect(() => {
    const listener = (e: PopStateEvent) => {
      if (e.state?.denki) {
        routeRestore.current = true;
        setTab(e.state.tab);
        setPage(e.state.page);
        setModal(null);
      }
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    if (routeRestore.current) {
      routeRestore.current = false;
      return;
    }
    const data = { denki: true, tab, page };
    if (routeFirst.current) {
      window.history.replaceState(data, "");
      routeFirst.current = false;
    } else window.history.pushState(data, "");
  }, [tab, page]);
  useEffect(() => {
    if (!modal && !offline) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const timer = setTimeout(
      () => dialog.current?.querySelector<HTMLElement>("button")?.focus(),
      20,
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setOffline(null);
      }
      if (e.key === "Tab") {
        const els = dialog.current?.querySelectorAll<HTMLElement>(
          'button,input,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      previousFocus.current?.focus();
    };
  }, [modal, offline]);
  useEffect(() => {
    const result = (event: Event) =>
      setToast((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener("denki-file-result", result);
    return () => window.removeEventListener("denki-file-result", result);
  }, []);
  useEffect(() => {
    window.denkiHandleBack = () => {
      if (modal) {
        setModal(null);
        return true;
      }
      if (offline) {
        setOffline(null);
        return true;
      }
      return false;
    };
    return () => {
      delete window.denkiHandleBack;
    };
  }, [modal, offline]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 1600);
    return () => clearTimeout(timer);
  }, [celebration]);
  function persist(next: Game) {
    live.current = next;
    setGame(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaveError("");
    } catch {
      setSaveError("บันทึกไม่สำเร็จ ส่งออกไฟล์สำรองเพื่อเก็บความคืบหน้า");
    }
  }
  function playSound(kind: "tap" | "buy" | "reward") {
    if (live.current?.reducedMotion) return;
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audio.current ?? (audio.current = new Ctx());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const base = kind === "reward" ? 660 : kind === "buy" ? 420 : 260;
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(base * (kind === "tap" ? 1.18 : 1.5), ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch { /* audio is optional */ }
  }
  function act(a: Action) {
    try {
      if (!live.current) return;
      const before = advanceTo(live.current).state;
      const updated = applyAction(before, a);
      if (a.type === "pedal") {
        if (updated.totalProduced === before.totalProduced) return;
        setPedalPulse((pulse) => pulse + 1);
        playSound("tap");
        persist(updated);
        return;
      }
      if (a.type === "grant" || a.type === "mission") {
        playSound("reward");
        setCelebration({
          id: Date.now(),
          label: "ทุน " + money(updated.cash - before.cash),
          positive: true,
        });
      } else if (
        ["buy", "buySmall", "repair", "replace", "grid", "battery"].includes(
          a.type,
        )
      ) {
        setCelebration({
          id: Date.now(),
          label:
            a.type === "buy" || a.type === "buySmall"
              ? "เริ่มก่อสร้างแล้ว"
              : a.type === "repair"
                ? "เริ่มซ่อมบำรุง"
                : "อัปเกรดแล้ว",
          positive: false,
        });
      }
      if (a.type === "buy" || a.type === "buySmall" || a.type === "cloudReinvest") playSound("buy");
      persist(updated);
      setToast("ทำรายการเรียบร้อยแล้ว");
      setModal(null);
    } catch (e) {
      setToast((e as Error).message);
      setModal(null);
    }
  }
  function ask(title: string, body: string, action: Action, cost = 0) {
    setModal({ title, body, action, cost });
  }
  function navigate(next: string) {
    setTab(next);
    setPage("");
  }
  function exportSave() {
    if (!live.current) return;
    if (window.DenkiAndroid) {
      window.DenkiAndroid.saveJson(
        "denki-save-" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify(live.current, null, 2),
      );
      setToast("เลือกตำแหน่งบันทึกไฟล์สำรอง");
      return;
    }
    const blob = new Blob([JSON.stringify(live.current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "denki-save-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("ส่งออกไฟล์บันทึกแล้ว");
  }
  async function importSave(f?: File) {
    if (!f) return;
    try {
      if (f.size > 2e6) throw Error("ไฟล์ใหญ่เกินไป");
      const s: unknown = JSON.parse(await f.text());
      if (!validateSave(s)) throw Error("รูปแบบไฟล์บันทึกไม่ถูกต้อง");
      setModal({
        title: "แทนที่ข้อมูลปัจจุบัน?",
        body:
          "นำเข้ากิจการ " +
          s.name +
          " ความคืบหน้าปัจจุบันจะถูกแทนที่ ควรส่งออกสำรองก่อน",
        custom: () => {
          persist(advanceTo(s).state);
          setModal(null);
          setPage("");
          setTab("plant");
          setToast("นำเข้ากิจการเรียบร้อย");
        },
      });
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  const hiddenFile = (
    <input
      ref={file}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(e) => void importSave(e.target.files?.[0])}
    />
  );
  if (!game)
    return (
      <div className="welcome">
        <div className="welcome-wrap">
          <div className="eyebrow">
            <Zap size={15} /> SMALL START. BRIGHT FUTURE.
          </div>
          <h1>
            DENKI
            <span>
              FACTORY<span className="bolt">ϟ</span>
            </span>
          </h1>
          <p className="welcome-sub">โรงไฟฟ้าเล็ก ๆ ของเรา</p>
          <FactoryArt />
          <div className="welcome-copy">
            <h2>
              เริ่มจากแดดหนึ่งแผง
              <br />
              ไปให้ถึงพลังงานของวันพรุ่งนี้
            </h2>
            <p>
              เริ่มด้วยเงิน 0 บาท แผงโซลาร์ 400 W<br />
              และแบตเตอรี่เก่า 0.2 kWh ที่ได้รับมา
            </p>
          </div>
          <label className="field">
            ตั้งชื่อกิจการ
            <input
              maxLength={40}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ชื่อบริษัทของคุณ"
            />
          </label>
          <button
            className="btn primary full"
            onClick={() => {
              const s = initialGame(company);
              persist(s);
            }}
          >
            เปิดกิจการของฉัน <ArrowUpRight size={20} />
          </button>
          <button
            className="text-btn full"
            onClick={() => file.current?.click()}
          >
            <Upload size={16} /> นำเข้าเกมที่บันทึกไว้
          </button>
          {saveError && <p className="warning">{saveError}</p>}
          <p className="fine">
            โลกจำลองประเทศไทย · 1 วันจริง = 1 ปีธุรกิจ
            <br />
            ราคา ภาษี สัญญา และทุนเป็นกติกาสมมติของเกม
          </p>
          {hiddenFile}
        </div>
        {modal && (
          <div className="overlay">
            <div
              className="dialog"
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label={modal.title}
            >
              <h2>{modal.title}</h2>
              <p>{modal.body}</p>
              <button className="btn primary full" onClick={modal.custom}>
                นำเข้าข้อมูล
              </button>
              <button className="btn full" onClick={() => setModal(null)}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    );
  const s = game;
  const p = s.plants.find((p) => p.id === selected) ?? s.plants[0];
  const t = plantSpec(p);
  const progress = projectProgress(s);
  const today = weather(s.day);
  const hour = Math.floor((s.day % 1) * 24);
  const night = hour < 6 || hour >= 18;
  const unclaimed = MISSIONS.filter(
    (m) => s.totalProduced >= m.target && !s.claimed.includes(m.id),
  ).length;
  const currentPower = s.plants.reduce(
    (total, plant) => total + plantPower(plant, s.day),
    0,
  );
  const mainProducing = s.plants.some(
    (plant) => plantPower(plant, s.day) > 0.001,
  );
  const rolling = (value: number, format: (n: number) => string = money) => (
    <RollingNumber value={value} format={format} reduced={s.reducedMotion} />
  );
  const healthy = s.plants.every((p) => p.condition >= 60);
  const titles: Record<string, string> = {
    equipment: "อุปกรณ์ของเรา",
    detail: t.name,
    small: "พลังงานเล็ก ๆ",
    expand: "ขยายกิจการ",
    missions: "เป้าหมายของเรา",
    settings: "ตั้งค่า",
    help: "คู่มือเจ้าของกิจการ",
    notifications: "เรื่องที่ต้องดูแล",
    cashflow: "กระแสเงินสด",
    income: "ผลประกอบการ",
    ledger: "รายการเงินเข้าออก",
    contracts: "สัญญาขายไฟ",
    loans: "สินเชื่อธุรกิจ",
    tax: "ภาษีและกำหนดชำระ",
    policy: "ดูแลอัตโนมัติ",
    stock: "ข้อมูลหุ้น",
    trade: sell ? "ขายหุ้น" : "ซื้อหุ้น",
    dividends: "เงินปันผล",
    history: "ประวัติลงทุน",
    save: "บันทึกและสำรอง",
    research: "เทคโนโลยี",
    project: "โครงการต่อไป",
  };
  const stat = (label: string, value: React.ReactNode, sub?: string) => (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
  const link = (
    icon: React.ReactNode,
    title: string,
    desc: string,
    dest: string,
    tone = "",
  ) => (
    <button className={"menu-row " + tone} onClick={() => setPage(dest)}>
      <span className="menu-icon">{icon}</span>
      <span>
        <b>{title}</b>
        <small>{desc}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
  const header = (kicker: string, title: string, subtitle?: string) => (
    <div className="section-head">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
  const plantCard = (item: Plant) => {
    const def = plantSpec(item);
    return (
      <button
        className="plant-card"
        key={item.id}
        onClick={() => {
          setSelected(item.id);
          setPage("detail");
        }}
      >
        <div className="plant-icon" style={{ background: def.color + "45" }}>
          {item.equipment === "breeze" ? <Wind /> : <Icon tier={item.tier} />}
        </div>
        <div className="grow">
          <b>{def.name}</b>
          <small>
            {power(def.kw)} ·{" "}
            {s.day < item.repairUntil
              ? "กำลังเตรียมระบบ"
              : item.condition < 20
                ? "หยุดผลิต"
                : "เดินระบบแล้ว"}
          </small>
          <div className="meter">
            <i
              style={{
                width: item.condition + "%",
                background: item.condition < 60 ? "#ee9474" : "",
              }}
            />
          </div>
        </div>
        <span className="plant-condition">
          {Math.round(item.condition)}%<ChevronRight size={16} />
        </span>
      </button>
    );
  };
  const smallShop = (
    <>
      {header(
        "A LITTLE MORE POWER",
        "ให้แดดกับลมช่วยทำงาน",
        "ต่อกับระบบเดิม · ซื้อซ้ำได้ · ไม่มีค่าเชื้อเพลิง",
      )}
      <div className="small-shop">
        {SMALL_GENERATORS.map((item) => {
          const owned = s.plants.filter((p) => p.equipment === item.id).length;
          return (
            <article className="generator-card" key={item.id}>
              <div
                className={
                  "generator-picture " + (item.id === "breeze" ? "mint" : "sky")
                }
              >
                <span className="paper-label">
                  {item.id === "breeze" ? "ลมมา ไฟมา" : "แดดออก ทำงานเอง"}
                </span>
                <SmallGeneratorArt
                  wind={item.id === "breeze"}
                  active={item.id === "breeze" ? windSpeed(s.day) >= 3 : !night}
                  speed={windSpeed(s.day)}
                  reduced={s.reducedMotion}
                />
                <span className="capacity-sticker">{item.kw * 1000} W</span>
              </div>
              <div className="generator-copy">
                <span className="eyebrow">
                  {owned ? `มีแล้ว ${owned} ชุด` : "เริ่มเล็ก เติบโตได้"}
                </span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="line-item">
                  <span>พร้อมใช้ใน 1 นาทีจริง</span>
                  <b>{money(item.cost)}</b>
                </div>
                <button
                  className="btn primary full"
                  disabled={s.cash < item.cost || s.plants.length >= 100}
                  onClick={() =>
                    ask(
                      "ซื้อ " + item.name,
                      "ต่อกับระบบเดิม ใช้เวลา 6 ชั่วโมงเกม มีค่าบำรุงรักษาและค่าเสื่อม " +
                        (item.id === "breeze"
                          ? "กำลัง 200 W เป็นพิกัดสูงสุด ลมต่ำกว่า 3 m/s หรือแรงตั้งแต่ 22 m/s จะหยุดผลิต"
                          : "ผลิตตอนมีแดด แผงมือสองเริ่มด้วยสภาพต่ำกว่าแผงใหม่"),
                      { type: "buySmall", equipment: item.id },
                      item.cost,
                    )
                  }
                >
                  {s.cash < item.cost
                    ? "เงินไม่พอ · ขาด " + money(item.cost - s.cash)
                    : "ซื้อ " + item.name}
                  <Plus size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="fine">
        อุปกรณ์เสริมช่วยเพิ่มรายได้และรางวัลพลังงาน
        เป้าหมายโครงการใหญ่ใช้ประสบการณ์และการผลิตของโครงการหลัก
      </p>
    </>
  );
  const cloud = s.cloud ?? { pods: 0, racks: 0, regions: 0, reinvest: false, spent: 0 };
  const cloudView = (
    <>
      {header("DENKI CLOUD", "เปลี่ยนไฟฟ้าเป็นกำลังประมวลผล", "รายได้เติบโตจาก Server Pod ที่นำกำไรกลับมาสร้างต่อ")}
      <section className="panel cloud-panel">
        <div className="eyebrow">CLOUD COMPUTE CLUSTER</div>
        <h2>{cloud.pods.toLocaleString("th-TH")} Server Pod</h2>
        <p>รายได้จากคลาวด์จะเกิดเมื่อมีไฟฟ้าส่วนเกินและลูกค้าใช้งาน</p>
        <div className="line-item"><span>รายได้โดยประมาณ</span><b>{money(cloud.pods * 0.4)}/ชม.</b></div>
        <div className="line-item"><span>Rack / Region</span><b>{cloud.racks} / {cloud.regions}</b></div>
        <button className="btn primary full" disabled={s.cash < 100} onClick={() => act({ type: "cloudReinvest", enabled: cloud.reinvest, amount: 100 })}>
          ซื้อ Server Pod ฿100 <Plus size={16} />
        </button>
        <button className="btn full" disabled={!cloud.pods} onClick={() => act({ type: "cloudReinvest", enabled: !cloud.reinvest })}>
          {cloud.reinvest ? "ปิด Reinvest อัตโนมัติ" : "เปิด Reinvest อัตโนมัติ"}
        </button>
        <p className="fine">เมื่อเปิด Reinvest ระบบจะนำกำไรสุทธิไปซื้อ Pod เพิ่มเป็นชุด สูงสุด 25 เครื่องต่อรอบผลิต</p>
      </section>
    </>
  );
  const projectView = (
    <>
      <div className="project-hero">
        <span className="tag">บทที่ {s.highest + 1} / 7</span>
        <Icon tier={Math.min(6, s.highest + 1)} />
        <h2>
          {s.highest === 6 ? "พลังงานที่ยั่งยืน" : TIERS[s.highest + 1].name}
        </h2>
        <p>
          {s.highest === 6
            ? "รักษาการเดินเครื่องและเตรียมเงินปลดระวาง"
            : "เตรียมกิจการให้พร้อมสำหรับก้าวต่อไป"}
        </p>
      </div>
      {s.highest < 6 ? (
        <>
          <div className="panel">
            <h3>เงื่อนไขทุนเปลี่ยนผ่าน</h3>
            <Progress
              label={
                s.highest === 0
                  ? "ทดลองเดินระบบ 44 วันธุรกิจ (~3 ชั่วโมงจริง)"
                  : "ประสบการณ์ " + num(TIERS[s.highest].years) + " ปีธุรกิจ"
              }
              value={progress.time}
            />
            <Progress
              label={"ผลิตไฟ " + energy(progress.target)}
              value={progress.energy}
            />
            <div className="line-item">
              <span>สภาพโครงการหลัก ≥ 60%</span>
              <b className={progress.condition ? "positive" : "negative"}>
                {progress.condition ? "ผ่านแล้ว" : "ต้องซ่อมบำรุง"}
              </b>
            </div>
            <div className="divider" />
            <div className="line-item">
              <span>ทุนโครงการถัดไป</span>
              <b>฿{compact(projectGrant(s))}</b>
            </div>
            <p className="fine">
              ทุนสมมติช่วยย่นระยะเติบโต ไม่ใช่รายได้ขายไฟหรือโครงการภาครัฐจริง
              รวมงบเผื่อซ่อมและก่อสร้าง
            </p>
          </div>
          <button
            className="btn primary full"
            disabled={!progress.ready || s.grants.includes(s.highest)}
            onClick={() =>
              ask(
                "รับทุนโครงการถัดไป",
                "ปลดล็อก " +
                  TIERS[s.highest + 1].name +
                  " แล้วนำทุนไปจัดซื้อในหน้าขยายกิจการ",
                { type: "grant" },
              )
            }
          >
            {s.grants.includes(s.highest)
              ? "รับทุนแล้ว · ไปขยายกิจการ"
              : progress.ready
                ? "รับทุนและปลดล็อก"
                : "กำลังสะสมประสบการณ์"}{" "}
            <ArrowUpRight size={18} />
          </button>
          {s.unlocked > s.highest && (
            <button className="btn full" onClick={() => setPage("expand")}>
              ซื้อโครงการที่ปลดล็อกแล้ว
            </button>
          )}
        </>
      ) : (
        <>
          <div className="panel">
            <Progress
              label="เดินระบบนิวเคลียร์ครบ 1 ปีธุรกิจ"
              value={s.nuclearDays / 365}
            />
            <Progress
              label="เงินสำรองปลดระวาง 1% ของต้นทุน"
              value={s.decommission / (TIERS[6].cost * 0.01)}
            />
            <div className="line-item">
              <span>ผลประกอบการงวดล่าสุดเป็นบวก</span>
              <b>{s.lastMonth.profit > 0 ? "ผ่านแล้ว" : "ยังไม่ผ่าน"}</b>
            </div>
          </div>
          <button
            className="btn primary full"
            disabled={
              s.decommission >= TIERS[6].cost * 0.01 ||
              s.cash < TIERS[6].cost * 0.01 - s.decommission
            }
            onClick={() =>
              ask(
                "กันเงินปลดระวาง",
                "โอนเงินไปเป็นเงินสำรองเฉพาะ ไม่ใช่ค่าใช้จ่ายทางบัญชี",
                { type: "decommission" },
                TIERS[6].cost * 0.01 - s.decommission,
              )
            }
          >
            กันเงินปลดระวาง
          </button>
          {s.won && (
            <div className="success panel">
              <Flag />
              <h2>จากแผงแรก สู่นิวเคลียร์</h2>
              <p>
                คุณสร้างกิจการที่ยั่งยืนสำเร็จแล้ว
                เล่นต่อและดูแลเมืองของคุณได้เสมอ
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
  function renderPage() {
    if (page === "small") return smallShop;
    if (page === "cloud") return cloudView;
    if (page === "equipment")
      return (
        <>
          {header(
            "OUR LITTLE MACHINES",
            "เครื่องจักรที่พาเรามาถึงวันนี้",
            "ซ่อมบำรุงก่อนขัดข้อง คุ้มกว่าหยุดผลิต",
          )}
          {s.plants.map(plantCard)}
          {link(
            <ShieldCheck />,
            "ตั้งนโยบายอัตโนมัติ",
            "ให้ระบบช่วยดูแลตามงบที่คุณกำหนด",
            "policy",
          )}
        </>
      );
    if (page === "detail")
      return (
        <>
          {header("PLANT DETAILS", t.name)}
          {p.equipment ? (
            <div className="equipment-illustration">
              <SmallGeneratorArt
                wind={p.equipment === "breeze"}
                active={plantPower(p, s.day) > 0.001}
                speed={windSpeed(s.day)}
                reduced={s.reducedMotion}
              />
            </div>
          ) : (
            <FactoryArt
              tier={p.tier}
              night={night}
              active={plantPower(p, s.day) > 0.001}
              reduced={s.reducedMotion}
            />
          )}
          <div className="stats three">
            {stat("กำลังติดตั้ง", power(t.kw))}
            {stat("สภาพ", num(p.condition) + "%")}
            {stat("อายุ", num(p.age / 365, 1) + " ปี")}
          </div>
          <div className="panel">
            <div className="line-item">
              <span>สถานะ</span>
              <b>
                {s.day < p.repairUntil
                  ? "พร้อมใช้อีก " + num(p.repairUntil - s.day) + " วันเกม"
                  : p.condition < 20
                    ? "หยุดผลิต · ต้องซ่อม"
                    : "กำลังเดินระบบ"}
              </b>
            </div>
            <div className="line-item">
              <span>กำลังผลิตตอนนี้</span>
              <b>{power(plantPower(p, s.day))}</b>
            </div>
            {p.equipment === "breeze" && (
              <div className="line-item">
                <span>ลมบริเวณนี้</span>
                <b>{num(windSpeed(s.day))} m/s</b>
              </div>
            )}
            <div className="line-item">
              <span>ผลิตสะสม</span>
              <b>{energy(p.produced)}</b>
            </div>
            <div className="line-item">
              <span>กำลังส่งออกสูงสุด</span>
              <b>{power(t.kw * (p.grid ? 1 : 0.5))}</b>
            </div>
            <div className="line-item">
              <span>แบตเตอรี่</span>
              <b>
                {energy(p.stored)} / {energy(p.battery)}
              </b>
            </div>
            <div className="line-item">
              <span>มูลค่าบัญชีคงเหลือ</span>
              <b>{money(p.book)}</b>
            </div>
            <p className="fine">
              ค่าเสื่อมเป็นรายการบัญชี แยกจากสภาพเครื่องและเงินสด
            </p>
          </div>
          <h3>ดูแลและปรับปรุง</h3>
          <button
            className="action-card"
            disabled={p.condition >= 96 || s.day < p.repairUntil}
            onClick={() =>
              ask(
                "บำรุงรักษา " + t.name,
                "สภาพเพิ่มสูงสุด 24 จุด ไม่เกิน 96% อายุไม่รีเซ็ต หยุดผลิต 2 วันเกม",
                { type: "repair", id: p.id },
                repairCost(p),
              )
            }
          >
            <Wrench />
            <span>
              <b>บำรุงรักษา</b>
              <small>
                {p.condition >= 96
                  ? "เครื่องยังสภาพดี"
                  : money(repairCost(p)) + " · หยุด 2 วันเกม"}
              </small>
            </span>
            <ChevronRight />
          </button>
          <button
            className="action-card"
            disabled={p.grid || s.day < p.repairUntil}
            onClick={() =>
              ask(
                "เพิ่มความสามารถส่งออก",
                "ขยายขีดจำกัดส่งออกจาก 50% เป็น 100% ของกำลังติดตั้ง เป็นการย่อขั้นตอนอนุมัติในเกม",
                { type: "grid", id: p.id },
                gridCost(p),
              )
            }
          >
            <Cable />
            <span>
              <b>ขยายการเชื่อมต่อ</b>
              <small>{p.grid ? "ขยายเต็มแล้ว" : money(gridCost(p))}</small>
            </span>
            <Plus />
          </button>
          <button
            className="action-card"
            disabled={p.battery >= t.kw * 2 || s.day < p.repairUntil}
            onClick={() =>
              ask(
                "ติดตั้งแบตเตอรี่",
                "เก็บไฟส่วนเกินได้ " +
                  energy(t.kw * 2) +
                  " มีการสูญเสียขณะชาร์จและจ่าย เหมาะกับสัญญาตามเวลา",
                { type: "battery", id: p.id },
                batteryCost(p),
              )
            }
          >
            <Battery />
            <span>
              <b>ติดตั้งแบตเตอรี่</b>
              <small>
                {p.battery >= t.kw * 2
                  ? "เต็มพื้นที่แล้ว"
                  : money(batteryCost(p))}
              </small>
            </span>
            <Plus />
          </button>
          <button
            className="text-btn full"
            onClick={() =>
              ask(
                "เปลี่ยนอุปกรณ์ใหม่",
                "ต้นทุนสุทธิหลังขายซาก 90% ของราคาใหม่ อายุเริ่มใหม่ สภาพ 100% หยุด 5 วันเกม",
                { type: "replace", id: p.id },
                p.cost * 0.9,
              )
            }
          >
            เปลี่ยนอุปกรณ์ทั้งชุด · {money(p.cost * 0.9)}
          </button>
        </>
      );
    if (page === "expand")
      return (
        <>
          {header(
            "ROOM TO GROW",
            "ก้าวเล็ก ๆ ที่ใหญ่ขึ้น",
            "ซื้อเมื่อพร้อม เหลือเงินไว้ดูแลเครื่องด้วยนะ",
          )}
          <button className="small-shop-link" onClick={() => setPage("small")}>
            <Wind />
            <span>
              <b>พลังงานเล็ก ๆ เริ่ม ฿250</b>
              <small>แผงมือสองและกังหันลมสำหรับหลังบ้าน</small>
            </span>
            <ChevronRight />
          </button>
          {TIERS.map((tier, i) => {
            const owned = s.plants.some((p) => p.tier === i);
            const locked = i > s.unlocked;
            return (
              <div
                key={tier.id}
                className={"expansion-card " + (locked ? "locked" : "")}
              >
                <div className="flex">
                  <span
                    className="plant-icon"
                    style={{ background: tier.color + "45" }}
                  >
                    <Icon tier={i} />
                  </span>
                  <div className="grow">
                    <span className="eyebrow">CHAPTER 0{i + 1}</span>
                    <h3>{tier.name}</h3>
                  </div>
                  {locked ? (
                    <LockKeyhole size={20} />
                  ) : owned && i > 0 ? (
                    <Check size={22} />
                  ) : null}
                </div>
                <p>{tier.description}</p>
                <div className="line-item">
                  <span>{power(tier.kw)}</span>
                  <b>฿{compact(tier.cost)}</b>
                </div>
                <button
                  className="btn full"
                  disabled={locked || (owned && i > 0) || s.cash < tier.cost}
                  onClick={() =>
                    ask(
                      "ลงทุน " + tier.name,
                      "เริ่มก่อสร้าง ใช้เวลาประมาณ " +
                        (i === 6 ? "90" : i >= 4 ? "30" : "2") +
                        " วันเกม โครงการใหม่ยังมีค่าใช้จ่ายดูแล",
                      { type: "buy", tier: i },
                      tier.cost,
                    )
                  }
                >
                  {locked
                    ? "ผ่านเป้าหมายบทก่อนเพื่อปลดล็อก"
                    : owned && i > 0
                      ? "มีโครงการนี้แล้ว"
                      : s.cash < tier.cost
                        ? "เงินไม่พอ · ขาด ฿" + compact(tier.cost - s.cash)
                        : "ลงทุนโครงการนี้"}{" "}
                  {!locked && !(owned && i > 0) && <Plus size={16} />}
                </button>
              </div>
            );
          })}
        </>
      );
    if (page === "project") return projectView;
    if (page === "missions")
      return (
        <>
          {header(
            "ONE STEP AT A TIME",
            "ทุกก้าวมีความหมาย",
            "ทุนเริ่มต้นเป็นรางวัลสมมติ ไม่ใช่รายได้ขายไฟ",
          )}
          {MISSIONS.map((m) => (
            <div className="panel" key={m.id}>
              <div className="flex">
                <span className="round-icon">
                  <Flag size={21} />
                </span>
                <div>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                </div>
              </div>
              <Progress
                label={
                  energy(Math.min(s.totalProduced, m.target)) +
                  " / " +
                  energy(m.target)
                }
                value={s.totalProduced / m.target}
              />
              <button
                className="btn full"
                disabled={
                  s.totalProduced < m.target || s.claimed.includes(m.id)
                }
                onClick={() => act({ type: "mission", id: m.id })}
              >
                {s.claimed.includes(m.id)
                  ? "รับทุนแล้ว"
                  : s.totalProduced >= m.target
                    ? "รับทุน " + money(m.reward)
                    : "รางวัล " + money(m.reward)}
              </button>
            </div>
          ))}
          {link(
            <ArrowUpRight />,
            "เป้าหมายโครงการถัดไป",
            "เส้นทางสู่โรงไฟฟ้านิวเคลียร์",
            "project",
          )}
        </>
      );
    if (page === "policy")
      return (
        <>
          {header("A LITTLE HELP", "ดูแลได้ แม้ไม่ได้เปิดเกม")}
          <div className="panel">
            <h3>ซ่อมบำรุงอัตโนมัติ</h3>
            <p>
              เมื่อสภาพต่ำกว่า 65% ระบบจะซ่อมถ้าเงินหลังซ่อมไม่ต่ำกว่าเงินสำรอง
              หยุดเครื่อง 2 วันเกมตามปกติ
            </p>
            <label className="toggle">
              <span>เปิดใช้งาน</span>
              <input
                type="checkbox"
                checked={s.autoRepair}
                onChange={(e) =>
                  act({
                    type: "policy",
                    auto: e.target.checked,
                    reserve: s.reserve,
                  })
                }
              />
            </label>
          </div>
          <div className="panel">
            <label className="field">
              เงินสำรองขั้นต่ำ (บาท)
              <input
                type="number"
                min="0"
                value={reserve}
                onChange={(e) => setReserve(Number(e.target.value))}
              />
            </label>
            <button
              className="btn primary full"
              onClick={() =>
                act({ type: "policy", auto: s.autoRepair, reserve })
              }
            >
              บันทึกเงินสำรอง
            </button>
            <p className="fine">
              ระบบจะเตือนก่อนลงทุนจนเงินต่ำกว่าเกณฑ์ แต่คุณยังเลือกยืนยันได้
            </p>
          </div>
        </>
      );
    if (page === "cashflow" || page === "income")
      return (
        <>
          {header(
            "MONEY, EXPLAINED",
            page === "income" ? "กำไร ≠ เงินสด" : "เงินเข้า เงินออก",
            "งวดบัญชี 30 วันเกม · ไม่ใช่เดือนปฏิทินจริง",
          )}
          <div className="panel">
            <h3>งวดที่ปิดล่าสุด</h3>
            {[
              ["รายได้รวมปันผล", s.lastMonth.revenue],
              ["ต้นทุนดำเนินงาน", -s.lastMonth.expense],
              ["ค่าเสื่อมราคา", -s.lastMonth.depreciation],
              ["ดอกเบี้ย", -s.lastMonth.interest],
              ["ภาษีตัวอย่าง", -s.lastMonth.tax],
            ].map(([l, v]) => (
              <div className="line-item" key={l}>
                <span>{l}</span>
                <b className={Number(v) < 0 ? "negative" : ""}>
                  {money(Number(v), 2)}
                </b>
              </div>
            ))}
            <div className="divider" />
            <div className="line-item">
              <b>กำไรสุทธิ</b>
              <strong
                className={s.lastMonth.profit >= 0 ? "positive" : "negative"}
              >
                {money(s.lastMonth.profit, 2)}
              </strong>
            </div>
          </div>
          <div className="stats">
            {stat("เงินสดตอนนี้", money(s.cash, 2))}
            {stat(
              "เงินรับจากทุน",
              money(
                s.ledger
                  .filter((e) => e.kind === "grant")
                  .reduce((a, e) => a + e.cash, 0),
              ),
            )}
          </div>
          <div className="note">
            <CircleHelp size={20} />
            <p>
              ทุนและเงินกู้เพิ่มเงินสด แต่ไม่ใช่รายได้ขายไฟ
              ค่าเสื่อมลดกำไรโดยไม่หักเงินสด
              ส่วนเงินต้นเงินกู้ลดเงินสดโดยไม่ลดกำไร
            </p>
          </div>
          {s.history.length > 0 && (
            <div className="panel">
              <h3>รายได้และรายจ่าย 12 งวดล่าสุด</h3>
              <div className="chart" aria-label="กราฟรายได้และรายจ่าย">
                {s.history.map((h, i) => {
                  const max = Math.max(
                    1,
                    ...s.history.flatMap((h) => [h.revenue, h.expense]),
                  );
                  return (
                    <div className="bar-pair" key={i}>
                      <i
                        style={{
                          height: Math.max(2, (h.revenue / max) * 100) + "%",
                        }}
                      />
                      <i
                        style={{
                          height: Math.max(2, (h.expense / max) * 100) + "%",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <small>สีเขียว รายได้ · สีส้ม รายจ่ายเงินสด</small>
            </div>
          )}
          {link(
            <Wallet />,
            "ดูทุกรายการ",
            "รวมซื้ออุปกรณ์ เงินกู้ และลงทุน",
            "ledger",
          )}
        </>
      );
    if (page === "ledger" || page === "history")
      return (
        <>
          {header(
            "THE PAPER TRAIL",
            page === "history" ? "ประวัติการลงทุน" : "สมุดเงินสด",
            "แสดงรายการล่าสุดไม่เกิน 160 รายการ",
          )}
          {(page === "history"
            ? s.ledger.filter(
                (e) => e.kind === "trade" || e.kind === "dividend",
              )
            : s.ledger
          ).length === 0 ? (
            <Empty
              icon={<Wallet />}
              title="ยังไม่มีรายการ"
              text="เมื่อกิจการเริ่มเดิน รายการจะปรากฏที่นี่"
            />
          ) : (
            (page === "history"
              ? s.ledger.filter(
                  (e) => e.kind === "trade" || e.kind === "dividend",
                )
              : s.ledger
            ).map((e) => (
              <div className="transaction" key={e.id}>
                <span
                  className={"transaction-icon " + (e.cash >= 0 ? "in" : "out")}
                >
                  {e.cash >= 0 ? (
                    <ArrowUpRight size={19} />
                  ) : (
                    <Banknote size={19} />
                  )}
                </span>
                <div className="grow">
                  <b>{e.label}</b>
                  <small>{date(e.day)}</small>
                </div>
                <b className={e.cash >= 0 ? "positive" : "negative"}>
                  {e.cash >= 0 ? "+" : ""}
                  {money(e.cash, 2)}
                </b>
              </div>
            ))
          )}
        </>
      );
    if (page === "contracts")
      return (
        <>
          {header(
            "A FAIR DEAL",
            "เลือกวิธีขายไฟ",
            "รับซื้อและชำระรายวันแบบย่อสำหรับเกม",
          )}
          <div className="note">
            <ShieldCheck size={24} />
            <p>
              กิจการในเกมถือว่าผ่านการอนุมัติแล้ว
              การขายไฟจริงต้องเป็นไปตามโครงการและเงื่อนไขของการไฟฟ้า
            </p>
          </div>
          {(
            [
              {
                id: "fixed",
                name: "สัญญาราคาคงที่",
                rate: "฿3.20 / kWh",
                desc: "ทุกช่วงเวลาราคาเท่ากัน รายรับคาดการณ์ง่าย เหมาะกับช่วงเริ่มต้น",
              },
              {
                id: "peak",
                name: "สัญญาตามช่วงเวลา",
                rate: "฿2.65–5.20 / kWh",
                desc: "18:00–22:00 ได้ ฿5.20 ช่วงอื่น ฿2.65 เหมาะกับแบตเตอรี่หรือลม",
              },
            ] as const
          ).map((c) => (
            <div className="panel" key={c.id}>
              <div className="flex">
                <h3 className="grow">{c.name}</h3>
                {s.contract === c.id && (
                  <span className="tag green">ใช้อยู่</span>
                )}
              </div>
              <strong className="display-number">{c.rate}</strong>
              <p>{c.desc}</p>
              <button
                className="btn full"
                disabled={s.contract === c.id}
                onClick={() =>
                  ask(
                    "เปลี่ยนสัญญาขายไฟ",
                    c.desc + " · เป็นตัวเลือกตลาดสมมติในเกม",
                    { type: "contract", value: c.id },
                  )
                }
              >
                {s.contract === c.id ? "สัญญาปัจจุบัน" : "เลือกสัญญานี้"}
              </button>
            </div>
          ))}
          <p className="fine">
            อัตราทั้งหมดเป็นสมมติฐานของเกม ไม่ใช่อัตรารับซื้อไฟฟ้าปัจจุบัน
          </p>
        </>
      );
    if (page === "loans")
      return (
        <>
          {header("GROW WITH CARE", "เงินทุนที่มีต้นทุน")}
          <div className="summary-card blue">
            <span>หนี้คงเหลือ</span>
            <strong>{money(totalDebt(s))}</strong>
            <small>ดอกเบี้ยตัวอย่าง 7.5% ต่อปีธุรกิจ</small>
          </div>
          <div className="panel">
            <h3>ขอสินเชื่อ</h3>
            <p>
              วงเงินรวมสูงสุด 25% ของมูลค่าบัญชีสินทรัพย์ หรืออย่างน้อย ฿10,000
            </p>
            <label className="field">
              จำนวนเงิน (บาท)
              <input
                type="number"
                min="100"
                value={loan}
                onChange={(e) => setLoan(Number(e.target.value))}
              />
            </label>
            <p>
              ดอกเบี้ยงวดแรกประมาณ {money((loan * 0.075) / 12, 2)}{" "}
              และคืนเงินต้นประมาณ {money(loan / 60 + 100, 2)} ทุก 30 วันเกม
            </p>
            <button
              className="btn primary full"
              onClick={() =>
                ask(
                  "รับเงินกู้ " + money(loan),
                  "เงินกู้ไม่ใช่รายได้ มีดอกเบี้ยและหักคืนเงินต้นทุกงวด",
                  { type: "loan", amount: loan },
                  -loan,
                )
              }
            >
              ตรวจสอบและกู้เงิน
            </button>
          </div>
          <button
            className="btn full"
            disabled={totalDebt(s) <= 0 || s.cash < totalDebt(s)}
            onClick={() =>
              ask(
                "คืนเงินต้นทั้งหมด",
                "ปิดภาระหนี้ ค่างวดและดอกเบี้ยอนาคตจะลดลง",
                { type: "repay" },
                totalDebt(s),
              )
            }
          >
            คืนหนี้ทั้งหมด
          </button>
        </>
      );
    if (page === "tax")
      return (
        <>
          {header("NO SURPRISE BILLS", "ภาษีและภาระงวดถัดไป")}
          <div className="panel">
            <div className="line-item">
              <span>ปิดงวดครั้งถัดไป</span>
              <b>อีก {num(30 - (Math.floor(s.day) % 30), 0)} วันเกม</b>
            </div>
            <div className="line-item">
              <span>ดอกเบี้ยประมาณ</span>
              <b>{money((totalDebt(s) * 0.075) / 12, 2)}</b>
            </div>
            <div className="line-item">
              <span>ภาษีงวดล่าสุด</span>
              <b>{money(s.lastMonth.tax, 2)}</b>
            </div>
            <div className="line-item">
              <span>ภาษีสะสม</span>
              <b>{money(s.tax, 2)}</b>
            </div>
          </div>
          <div className="note">
            <CircleHelp />
            <p>
              ต้นแบบใช้ภาษี 20% จากกำไรงวดที่เป็นบวก ไม่ใช่จากยอดขาย
              ไม่จำลองเกณฑ์ SME, VAT, ภาษีหัก ณ ที่จ่าย หรือผลขาดทุนสะสม
              จึงไม่ใช่เครื่องคำนวณภาษีไทยจริง
            </p>
          </div>
        </>
      );
    if (page === "stock" || page === "trade") {
      const st = STOCKS.find((x) => x.id === stock)!;
      const h = s.holdings[stock] ?? { qty: 0, cost: 0 };
      const price = stockPrice(stock, s.day);
      const gross = price * qty;
      return (
        <>
          {header(st.id, st.name, st.sector)}
          <div className="stock-price">
            {money(price, 2)}
            <span className="tag">หุ้นสมมติ</span>
          </div>
          <div className="sparkline">
            <svg
              viewBox="0 0 320 100"
              role="img"
              aria-label="ราคาหุ้นย้อนหลัง 180 วันเกม"
            >
              <path
                d={
                  "M" +
                  Array.from({ length: 30 }, (_, i) => {
                    const d = Math.max(0, s.day - 180 + (i * 180) / 29);
                    const val = stockPrice(stock, d);
                    return `${(i * 320) / 29},${100 - (val / (st.base * 1.6)) * 90}`;
                  }).join(" L")
                }
                fill="none"
                stroke="#34865f"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span>180 วันเกมที่ผ่านมา</span>
          </div>
          <div className="stats">
            {stat("ถืออยู่", num(h.qty, 0) + " หุ้น")}
            {stat("ต้นทุนเฉลี่ย", money(h.qty ? h.cost / h.qty : 0, 2))}
          </div>
          {page === "stock" ? (
            <>
              <div className="panel">
                <div className="line-item">
                  <span>มูลค่าที่ถือ</span>
                  <b>{money(h.qty * price)}</b>
                </div>
                <div className="line-item">
                  <span>อัตราปันผลฐานสมมติ</span>
                  <b>{num(st.yield * 100)}% / ปีเกม</b>
                </div>
                <p className="fine">
                  ปันผลทุก 90 วันเกมตามผลประกอบการ อัตราจริงในเกมอาจลดลง
                  ราคาผันผวนและขาดทุนได้
                </p>
              </div>
              <div className="button-pair">
                <button
                  className="btn primary"
                  onClick={() => {
                    setSell(false);
                    setQty(10);
                    setPage("trade");
                  }}
                >
                  ซื้อหุ้น
                </button>
                <button
                  className="btn"
                  disabled={!h.qty}
                  onClick={() => {
                    setSell(true);
                    setQty(Math.min(10, h.qty));
                    setPage("trade");
                  }}
                >
                  ขายหุ้น
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="panel">
                <h3>
                  {sell ? "ขาย" : "ซื้อ"} {st.id}
                </h3>
                <label className="field">
                  จำนวนหุ้น
                  <input
                    inputMode="numeric"
                    type="number"
                    min="1"
                    step="1"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </label>
                <div className="line-item">
                  <span>มูลค่าหุ้น</span>
                  <b>{money(gross, 2)}</b>
                </div>
                <div className="line-item">
                  <span>ค่าธรรมเนียมตัวอย่าง 0.25%</span>
                  <b>{money(gross * 0.0025, 2)}</b>
                </div>
                <div className="line-item">
                  <b>{sell ? "เงินรับสุทธิ" : "ยอดชำระ"}</b>
                  <b>{money(gross * (sell ? 0.9975 : 1.0025), 2)}</b>
                </div>
                <button
                  className="btn primary full"
                  disabled={
                    !Number.isInteger(qty) ||
                    qty <= 0 ||
                    (sell ? h.qty < qty : s.cash < gross * 1.0025)
                  }
                  onClick={() =>
                    ask(
                      (sell ? "ขาย " : "ซื้อ ") + qty + " หุ้น " + st.id,
                      "ราคายึดตามเวลายืนยัน ระบบคำนวณค่าธรรมเนียม 0.25% อีกครั้ง",
                      { type: "trade", stock, qty, sell },
                      gross * (sell ? -0.9975 : 1.0025),
                    )
                  }
                >
                  ตรวจสอบ{sell ? "การขาย" : "การซื้อ"}
                </button>
              </div>
              <p className="fine">
                ใช้เงินของบริษัทเท่านั้น ไม่มีการกู้ซื้อหุ้นโดยตรง
              </p>
            </>
          )}
        </>
      );
    }
    if (page === "dividends")
      return (
        <>
          {header("PATIENT MONEY", "รายได้จากเงินที่พักไว้")}
          <div className="summary-card green">
            <span>ปันผลที่รับแล้ว</span>
            <strong>{money(s.dividends, 2)}</strong>
            <small>
              รอบถัดไปอีก {num(90 - (Math.floor(s.day) % 90), 0)} วันเกม
            </small>
          </div>
          {STOCKS.filter((st) => s.holdings[st.id]?.qty).map((st) => (
            <div className="panel" key={st.id}>
              <h3>{st.name}</h3>
              <div className="line-item">
                <span>ฐานปันผลประมาณ / ไตรมาส</span>
                <b>
                  {money((s.holdings[st.id].qty * st.base * st.yield) / 4, 2)}
                </b>
              </div>
              <span className="tag">ประมาณการ · ไม่รับประกัน</span>
            </div>
          ))}
          {!Object.values(s.holdings).some((h) => h.qty > 0) && (
            <Empty
              icon={<Coins />}
              title="ยังไม่มีหุ้นที่รับปันผล"
              text="กันเงินดูแลกิจการก่อน แล้วค่อยเริ่มลงทุน"
            />
          )}
          {link(
            <Clock3 />,
            "ประวัติรับเงินจริง",
            "ดูรายการปันผลและซื้อขาย",
            "history",
          )}
        </>
      );
    if (page === "research")
      return (
        <>
          {header(
            "BETTER BY DESIGN",
            "เทคโนโลยีที่เติบโตไปด้วยกัน",
            "การวิจัยปลดล็อกผ่านประสบการณ์โครงการ",
          )}
          <div className="timeline">
            {TIERS.map((t, i) => (
              <div
                className={"timeline-item " + (i <= s.unlocked ? "done" : "")}
                key={t.id}
              >
                <span className="timeline-dot">
                  {i <= s.highest ? <Check size={17} /> : i + 1}
                </span>
                <div>
                  <h3>{t.name}</h3>
                  <p>
                    {i <= s.highest
                      ? "ใช้งานแล้ว"
                      : i <= s.unlocked
                        ? "พร้อมลงทุน"
                        : "ผ่านบทที่ " + i + " เพื่อปลดล็อก"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn primary full"
            onClick={() => setPage("project")}
          >
            ดูเป้าหมายที่กำลังทำ
          </button>
        </>
      );
    if (page === "notifications")
      return (
        <>
          {header("KEEP AN EYE ON", "เรื่องเล็ก ๆ ที่สำคัญ")}
          {!healthy && (
            <div className="note warning">
              <Wrench />
              <p>มีเครื่องสภาพต่ำกว่า 60% แวะตรวจอุปกรณ์ก่อนขยายกิจการ</p>
            </div>
          )}
          {s.cash < s.reserve && (
            <div className="note warning">
              <Wallet />
              <p>
                เงินสดต่ำกว่าเงินสำรอง {money(s.reserve)}{" "}
                ควรชะลอรายจ่ายที่ไม่จำเป็น
              </p>
            </div>
          )}
          {s.plants
            .filter((p) => s.day < p.repairUntil)
            .map((p) => (
              <div className="panel" key={p.id}>
                <h3>{plantSpec(p).name}</h3>
                <p>
                  กำลังเตรียมระบบ / ซ่อม อีก {num(p.repairUntil - s.day)} วันเกม
                </p>
              </div>
            ))}
          <div className="panel">
            <h3>
              {today.label} · {today.temp}°C
            </h3>
            <p>
              {today.rain
                ? "วันนี้แดดน้อย ผลผลิตโซลาร์ลดลง ลมและแบตเตอรี่ช่วยกระจายความเสี่ยงได้"
                : "โอกาสดีในการผลิตไฟ ลองดูว่าสายส่งของคุณรองรับได้ครบหรือยัง"}
            </p>
          </div>
          {link(<Wrench />, "ตรวจอุปกรณ์", "ดูสภาพและกำหนดซ่อม", "equipment")}
          {link(
            <Flag />,
            "เป้าหมายและรางวัล",
            unclaimed + " รายการพร้อมรับ",
            "missions",
          )}
        </>
      );
    if (page === "help")
      return (
        <>
          {header("A SMALL FIELD GUIDE", "คู่มือเจ้าของพลังงาน")}
          {[
            [
              "เริ่มยังไงดี?",
              "แผงแรกผลิตเองตามเวลา หรือแตะปั่นไฟช่วยได้ ผลิตครบ 1 kWh รับทุน ฿500 ซื้อแผงมือสองเริ่ม ฿250 จากนั้นผลิตครบ 5 kWh รับทุน ฿1,000 เก็บซื้อกังหันลม ฿1,200 ไว้ช่วยผลิตตอนกลางคืน",
            ],
            [
              "กังหันลมเล็กทำงานยังไง?",
              "กำลัง 200 W เป็นพิกัด ไม่ใช่กำลังผลิตตลอดเวลา ผลิตตามความเร็วลมทั้งกลางวันและกลางคืน เริ่มที่ 3 m/s ถึงพิกัดที่ 11 m/s และหยุดป้องกันลมแรงตั้งแต่ 22 m/s ค่าแรงลมในเกมเป็นแบบจำลอง ไม่ใช่พยากรณ์อากาศจริง",
            ],
            [
              "กำลังกับพลังงาน",
              "kW คือกำลัง ณ ขณะหนึ่ง ส่วน kWh คือพลังงาน เช่น ผลิต 1 kW นาน 1 ชั่วโมง ได้ 1 kWh",
            ],
            [
              "โลกนี้เดินเร็วแค่ไหน?",
              "1 วันจริง = 365 วันเกม เดินระบบกลางวัน–กลางคืนตามเวลาเกม ออฟไลน์ได้สูงสุด 24 ชั่วโมงจริง จากนั้นหยุดทั้งรายรับและรายจ่าย",
            ],
            [
              "เงินสดกับกำไร",
              "ซื้อเครื่องจักรทำให้เงินสดลดทันที แต่ทยอยคิดค่าเสื่อมในกำไร เงินกู้และทุนไม่ใช่รายได้จากการผลิต",
            ],
            [
              "จากโซลาร์ถึงนิวเคลียร์",
              "สะสมประสบการณ์และพลังงานของโครงการหลัก รักษาสภาพ ≥ 60% แล้วรับทุนสมมติ เป้าหมายการออกแบบคือ 15–30 วันจริง ขึ้นกับการบริหาร",
            ],
            [
              "สมจริงแค่ไหน?",
              "หน่วยและหลักบัญชีอิงความจริง แต่ราคาจัดซื้อ อัตรารับซื้อ ภาษี การอนุญาต และทุนถูกย่อเพื่อเกม ไม่ใช่ข้อมูลลงทุนหรือกฎหมายปัจจุบัน",
            ],
            [
              "เล่นคนเดียวได้ไหม?",
              "คุณเป็นเจ้าของคนเดียว ไม่มีระบบจ้างพนักงาน ค่าติดตั้งและซ่อมรวมบริการผู้รับเหมารายครั้ง ไม่จำลองการปฏิบัติงานของโรงไฟฟ้าจริงทั้งหมด",
            ],
          ].map(([h, b]) => (
            <div className="panel" key={h}>
              <h3>{h}</h3>
              <p>{b}</p>
            </div>
          ))}
        </>
      );
    if (page === "save")
      return (
        <>
          {header("SAFE & SOUND", "เก็บกิจการของคุณไว้")}
          <div className="panel">
            <ShieldCheck size={32} />
            <h3>{saveError ? "บันทึกมีปัญหา" : "บันทึกในเครื่องอัตโนมัติ"}</h3>
            <p>
              {import.meta.env.VITE_NATIVE === "true"
                ? "บันทึกในแอปทุก 5 วินาทีและหลังทำรายการ การถอนแอปหรือล้างข้อมูลจะลบเกม ควรส่งออกสำรองไว้"
                : "บันทึกทุก 5 วินาทีและหลังทำรายการ ข้อมูลผูกกับเบราว์เซอร์นี้ การล้างข้อมูลเว็บไซต์จะลบเกม ควรส่งออกสำรองไว้"}
            </p>
            {saveError && <p className="negative">{saveError}</p>}
            <button
              className="btn full"
              onClick={() => {
                persist(s);
                setToast("ลองบันทึกข้อมูลแล้ว");
              }}
            >
              บันทึกอีกครั้ง
            </button>
          </div>
          <button className="btn primary full" onClick={exportSave}>
            <Download size={18} /> ส่งออกไฟล์สำรอง
          </button>
          <button className="btn full" onClick={() => file.current?.click()}>
            <Upload size={18} /> นำเข้าไฟล์สำรอง
          </button>
          <button
            className="text-btn danger full"
            onClick={() =>
              setModal({
                title: "เริ่มกิจการใหม่?",
                body: "ความคืบหน้าจะถูกแทนที่ กรุณาส่งออกไฟล์สำรองก่อน การดำเนินการนี้ย้อนกลับไม่ได้",
                danger: true,
                custom: () => {
                  persist(initialGame(s.name));
                  setPage("");
                  setTab("plant");
                  setModal(null);
                },
              })
            }
          >
            <RotateCcw size={16} /> เริ่มใหม่
          </button>
        </>
      );
    if (page === "settings")
      return (
        <>
          {header("MAKE YOURSELF AT HOME", "มุมเล็ก ๆ ของคุณ")}
          <div className="panel">
            <label className="field">
              ชื่อกิจการ
              <input
                value={s.name}
                maxLength={40}
                onChange={(e) => setGame({ ...s, name: e.target.value })}
                onBlur={() => persist(live.current!)}
              />
            </label>
            <label className="toggle">
              <span>
                <b>ลดการเคลื่อนไหว</b>
                <small>หยุดกังหันและแอนิเมชันตกแต่ง</small>
              </span>
              <input
                type="checkbox"
                checked={s.reducedMotion}
                onChange={(e) =>
                  persist({ ...s, reducedMotion: e.target.checked })
                }
              />
            </label>
          </div>
          <UpdatePanel />
          {link(
            <ShieldCheck />,
            "บันทึกและสำรอง",
            "เก็บในเครื่อง · ส่งออกและนำเข้า",
            "save",
          )}
          {link(
            <CircleHelp />,
            "วิธีเล่นและสมมติฐาน",
            "เวลา หน่วยพลังงาน และเศรษฐกิจ",
            "help",
          )}
          <div className="note">
            <Clock3 />
            <p>
              1 วันจริง = 1 ปีธุรกิจ
              <br />
              จำลองออฟไลน์สูงสุด 24 ชั่วโมงจริง
              <br />
              ไม่มีโฆษณาหรือการซื้อในเกมในเวอร์ชันนี้
            </p>
          </div>
          <p className="fine center">
            DENKI FACTORY · Prototype 0.4
            <br />
            ออกแบบสำหรับมือถือแนวตั้ง รวม Galaxy A54
            <br />
            ภาษาไทย · เสียงและ cloud save ยังไม่รองรับ
          </p>
        </>
      );
    return (
      <Empty
        icon={<CircleHelp />}
        title="กลับไปหน้าหลัก"
        text="เลือกเมนูด้านล่างเพื่อเดินทางต่อ"
      />
    );
  }
  return (
    <div className={"app " + (s.reducedMotion ? "reduced" : "")}>
      <div className="desktop-note">
        <Zap size={18} />
        <b>DENKI FACTORY</b>
        <span>small start. bright future.</span>
      </div>
      <div className="game-shell">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark">
              <Zap size={21} fill="currentColor" />
            </span>
            <div>
              <b>
                DENKI<span>FACTORY</span>
              </b>
              <small>{s.name}</small>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              aria-label="เป้าหมาย"
              onClick={() => setPage("missions")}
            >
              <Flag size={20} />
              {unclaimed > 0 && <i>{unclaimed}</i>}
            </button>
            <button
              className="icon-btn"
              aria-label="การแจ้งเตือน"
              onClick={() => setPage("notifications")}
            >
              <Bell size={20} />
              {(!healthy || s.cash < s.reserve) && <i className="dot" />}
            </button>
            <button
              className="icon-btn"
              aria-label="ตั้งค่า"
              onClick={() => setPage("settings")}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
        <div className="clock-strip">
          <span>
            <i /> {date(s.day)} · {hour.toString().padStart(2, "0")}:00
          </span>
          <span>ปีธุรกิจที่ {Math.floor(s.day / 365) + 1}</span>
        </div>
        {saveError && (
          <button className="save-error" onClick={() => setPage("save")}>
            <AlertTriangle size={16} /> บันทึกไม่สำเร็จ · แตะเพื่อสำรอง
          </button>
        )}
        <main ref={main} className="content" id="main-content">
          {page ? (
            <>
              <button
                className="back-btn"
                onClick={() => {
                  if (page === "trade") setPage("stock");
                  else if (page === "detail") setPage("equipment");
                  else setPage("");
                }}
              >
                <ArrowLeft size={17} /> {titles[page] ?? "ย้อนกลับ"}
              </button>
              {renderPage()}
            </>
          ) : (
            <>
              {tab === "plant" && (
                <>
                  <div className="home-intro">
                    <div>
                      <span className="eyebrow">
                        A LITTLE SUNSHINE, A BIG DREAM
                      </span>
                      <h1>
                        {night ? "คืนนี้ ให้ลมช่วยดูแล" : "วันนี้ แดดเป็นใจ"}
                        <span className="hand-dot">.</span>
                      </h1>
                    </div>
                    <span className="weather">
                      {night ? (
                        <Moon size={19} />
                      ) : today.rain ? (
                        <span>☁</span>
                      ) : (
                        <Sun size={19} />
                      )}{" "}
                      {night ? "กลางคืน" : today.label}
                    </span>
                  </div>
                  <div className="money-bar">
                    <div>
                      <span>เงินสดของเรา</span>
                      <strong>{rolling(s.cash, (n) => money(n, 2))}</strong>
                    </div>
                    <button
                      aria-label="ดูการเงิน"
                      onClick={() => navigate("business")}
                    >
                      <ArrowUpRight size={24} />
                    </button>
                  </div>
                  <div className="scene-wrap">
                    <FactoryArt
                      tier={s.highest}
                      night={night}
                      active={mainProducing}
                      breeze={s.plants.some((p) => p.equipment === "breeze")}
                      breezeActive={s.plants.some(
                        (p) =>
                          p.equipment === "breeze" &&
                          plantPower(p, s.day) > 0.001,
                      )}
                      extraPanels={
                        s.plants.filter(
                          (p) => p.equipment && p.equipment !== "breeze",
                        ).length
                      }
                      windSpeed={windSpeed(s.day)}
                      reduced={s.reducedMotion}
                    />
                    <span className="scene-caption">
                      <i className={night ? "night" : ""} />
                      {mainProducing
                        ? "กำลังผลิต · ส่งพลังงานเข้าโครงข่าย"
                        : night && s.highest < 4
                          ? "พักแผง รอแสงวันใหม่"
                          : "พักเครื่อง · ดูแลให้พร้อมผลิต"}
                    </span>
                    <button
                      className="scene-button"
                      onClick={() => setPage("equipment")}
                      aria-label="ดูรายละเอียดอุปกรณ์"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="weather-notes">
                    <span>
                      <Wind size={15} /> ลม {num(windSpeed(s.day))} m/s
                    </span>
                    <span>
                      {night
                        ? "โซลาร์พัก · ลมยังผลิตได้"
                        : "แดดและลม ทำงานตามธรรมชาติ"}
                    </span>
                  </div>
                  {s.highest === 0 && (
                    <section
                      className="early-path"
                      aria-label="เริ่มต้นพลังงานสะอาด"
                    >
                      <span className="eyebrow">SMALL STEPS, STEADY POWER</span>
                      <h3>มีตัวช่วยแล้ว ไม่ต้องปั่นอย่างเดียว</h3>
                      <p>แผงมือสองเริ่ม ฿250 · กังหันลม ฿1,200</p>
                      <div className="early-actions">
                        <button
                          className="btn primary"
                          onClick={() => setPage("small")}
                        >
                          <Wind size={17} /> เพิ่มพลังงานเล็ก ๆ
                        </button>
                        <button
                          className="btn"
                          onClick={() => setPage("missions")}
                        >
                          <Flag size={17} />{" "}
                          {unclaimed
                            ? `รับทุน ${unclaimed} รายการ`
                            : "ดูทุนเริ่มต้น"}
                        </button>
                      </div>
                    </section>
                  )}
                  <section className="early-path cloud-promo" aria-label="Denki Cloud">
                    <span className="eyebrow">DENKI CLOUD</span>
                    <h3>{(s.cloud?.pods ?? 0).toLocaleString("th-TH")} Server Pod กำลังรอไฟ</h3>
                    <p>แบ่งไฟส่วนเกินไปทำคลาวด์ แล้วนำกำไรกลับมาขยายแบบก้าวกระโดด</p>
                    <button className="btn" onClick={() => setPage("cloud")}>เปิดศูนย์ Cloud <ArrowUpRight size={16} /></button>
                  </section>
                  <section className="pedal-card" aria-label="จักรยานปั่นไฟ">
                    <div className="pedal-heading">
                      <b>พลังจากสองขา</b>
                      <span>จักรยาน 150 W</span>
                    </div>
                    <button
                      className="pedal-button"
                      aria-label="แตะปั่นไฟขาย"
                      onClick={() => act({ type: "pedal", at: Date.now() })}
                    >
                      <svg
                        key={pedalPulse}
                        className={
                          pedalPulse ? "pedal-bike pedaling" : "pedal-bike"
                        }
                        viewBox="0 0 190 105"
                        aria-hidden="true"
                        fill="none"
                        stroke="#544537"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 97h160" stroke="#d3dcb8" />
                        <g
                          className="pedal-wheel"
                          style={{ transformOrigin: "44px 72px" }}
                        >
                          <circle cx="44" cy="72" r="24" fill="#fffdf3" />
                          <path
                            d="M44 48v48M20 72h48"
                            stroke="#a3c8c1"
                            strokeWidth="2"
                          />
                        </g>
                        <g
                          className="pedal-wheel"
                          style={{ transformOrigin: "145px 72px" }}
                        >
                          <circle cx="145" cy="72" r="24" fill="#fffdf3" />
                          <path
                            d="M145 48v48M121 72h48"
                            stroke="#a3c8c1"
                            strokeWidth="2"
                          />
                        </g>
                        <path
                          d="m44 72 24-39 25 39H44l58-34 43 34-17-47"
                          stroke="#5caa8d"
                          strokeWidth="6"
                        />
                        <path d="M62 30h20m46-5h-13" />
                        <g
                          className="pedal-crank"
                          style={{ transformOrigin: "93px 72px" }}
                        >
                          <circle cx="93" cy="72" r="8" fill="#f8ce66" />
                          <path d="m84 82 18-20m-24 20h11m9-20h11" />
                        </g>
                        <path
                          d="m166 26-9 14h11l-6 13"
                          stroke="#e4a63c"
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="pedal-label">
                        แตะปั่นไฟ
                        <small>
                          ขายทันที +{money(PEDAL_KWH * priceAt(s, s.day), 2)} /
                          ครั้ง
                        </small>
                      </span>
                      {pedalPulse > 0 && (
                        <span
                          key={"reward" + pedalPulse}
                          className="pedal-reward"
                          aria-hidden="true"
                        >
                          +{money(PEDAL_KWH * priceAt(s, s.day), 2)}
                        </span>
                      )}
                    </button>
                    <p>
                      {num(PEDAL_KWH * 1000, 2)} Wh / ครั้ง · สูงสุด 4
                      ครั้ง/วินาที · ปั่นได้ทั้งกลางวันและกลางคืน
                    </p>
                    <small className="pedal-time">
                      ใช้เวลาเร่ง ×365 เช่นเดียวกับโรงไฟฟ้า · แตะทีละครั้ง
                      ไม่มีรายได้จากการกดค้าง
                    </small>
                  </section>
                  <div className="stats hero-stats">
                    {stat("กำลังผลิตตอนนี้", rolling(currentPower, power))}
                    {stat(
                      "พลังงานวันนี้",
                      rolling(s.todayEnergy, energy),
                      "เมื่อวาน " + energy(s.yesterdayEnergy),
                    )}
                  </div>

                  {s.totalProduced < 1 && (
                    <button
                      className="first-tip"
                      onClick={() => setPage("missions")}
                    >
                      <Sun size={18} />
                      <span>
                        แผงแรกทำงานเอง · ผลิตครบ 1 kWh รับทุน ฿500
                        <small>
                          แตะรับทุนในหน้าเป้าหมาย แล้วซื้อแผงมือสอง ฿250
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                  <div className="home-section">
                    <h3>
                      โรงไฟฟ้าของเรา <span>{s.plants.length} แห่ง</span>
                    </h3>
                    <button
                      className="text-btn"
                      onClick={() => setPage("equipment")}
                    >
                      ดูทั้งหมด <ChevronRight size={15} />
                    </button>
                  </div>
                  {s.plants.slice(-2).map(plantCard)}
                  <button
                    className="btn primary full"
                    onClick={() => setPage("expand")}
                  >
                    <Plus size={19} /> ขยายกิจการ <ArrowUpRight size={19} />
                  </button>
                  <button
                    className="next-chapter"
                    onClick={() => setPage("project")}
                  >
                    <span className="round-icon">
                      <Flag size={19} />
                    </span>
                    <div className="grow">
                      <b>
                        {s.highest === 6
                          ? "บทสุดท้าย · พลังงานที่ยั่งยืน"
                          : "เป้าหมายถัดไป · " + TIERS[s.highest + 1].name}
                      </b>
                      <div className="meter">
                        <i
                          style={{
                            width:
                              (s.highest === 6
                                ? Math.min(1, s.nuclearDays / 365)
                                : Math.min(progress.energy, progress.time)) *
                                100 +
                              "%",
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                  <p className="fine center">
                    เติบโตทีละนิด ไม่ต้องรีบก็ได้ <Leaf size={13} />
                  </p>
                </>
              )}
              {tab === "business" && (
                <>
                  {header(
                    "THE BUSINESS SIDE",
                    "ดูแลเงิน ดูแลอนาคต",
                    "เติบโตได้ไกล เมื่อเงินสดยังไหว",
                  )}
                  <div className="summary-card yellow">
                    <span>เงินสดพร้อมใช้</span>
                    <strong>{rolling(s.cash, (n) => money(n, 2))}</strong>
                    <div className="line-item">
                      <span>เงินสำรองที่ตั้งไว้</span>
                      <b>{money(s.reserve)}</b>
                    </div>
                  </div>
                  <div className="stats">
                    {stat(
                      "กำไรงวดล่าสุด",
                      <span
                        className={
                          s.lastMonth.profit < 0 ? "negative" : "positive"
                        }
                      >
                        {money(s.lastMonth.profit, 2)}
                      </span>,
                    )}
                    {stat("หนี้คงเหลือ", money(totalDebt(s)))}
                  </div>
                  {s.cash < s.reserve && (
                    <div className="note warning">
                      <AlertTriangle size={20} />
                      <p>เงินสดต่ำกว่าเงินสำรอง ควรเก็บเงินก่อนลงทุนเพิ่ม</p>
                    </div>
                  )}
                  {link(
                    <ChartNoAxesCombined />,
                    "กระแสเงินสด",
                    "รายรับ รายจ่าย และเงินที่เหลือจริง",
                    "cashflow",
                  )}
                  {link(
                    <Coins />,
                    "ผลประกอบการ",
                    "กำไร ต้นทุน และค่าเสื่อม",
                    "income",
                  )}
                  {link(
                    <Wallet />,
                    "สมุดเงินสด",
                    "ทุกเรื่องที่เงินเข้าและเงินออก",
                    "ledger",
                  )}
                  {link(
                    <Cable />,
                    "สัญญาขายไฟ",
                    s.contract === "fixed"
                      ? "ราคาคงที่ ฿3.20 / kWh"
                      : "ราคาตามช่วงเวลา ฿2.65–5.20 / kWh",
                    "contracts",
                  )}
                  {link(
                    <Building2 />,
                    "สินเชื่อธุรกิจ",
                    "ขยายได้ แต่ต้องจ่ายคืน",
                    "loans",
                  )}
                  {link(
                    <Banknote />,
                    "ภาษีและกำหนดชำระ",
                    "เตรียมพร้อมก่อนปิดงวด",
                    "tax",
                  )}
                  {link(
                    <ShieldCheck />,
                    "นโยบายอัตโนมัติ",
                    s.autoRepair
                      ? "ซ่อมอัตโนมัติเปิดอยู่"
                      : "ตั้งเงินสำรองและดูแลเครื่อง",
                    "policy",
                  )}
                  <p className="fine center">
                    ไม่มีพนักงานประจำ · คุณเป็นเจ้าของคนเดียว
                  </p>
                </>
              )}
              {tab === "invest" && (
                <>
                  {header(
                    "LET YOUR MONEY GROW",
                    "เงินที่พักไว้ ก็เติบโตได้",
                    "ลงทุนด้วยเงินเหลือ หลังกันเงินดูแลกิจการ",
                  )}
                  <div className="summary-card green">
                    <span>มูลค่าพอร์ตของเรา</span>
                    <strong>
                      {rolling(portfolioValue(s), (n) => money(n, 2))}
                    </strong>
                    <div className="line-item">
                      <span>กำไร / ขาดทุนที่ยังไม่ขาย</span>
                      <b>
                        {money(
                          portfolioValue(s) -
                            Object.values(s.holdings).reduce(
                              (a, h) => a + h.cost,
                              0,
                            ),
                          2,
                        )}
                      </b>
                    </div>
                  </div>
                  <div className="stats">
                    {stat("เงินสดพร้อมใช้", money(s.cash, 2))}
                    {stat("ปันผลรับแล้ว", money(s.dividends, 2))}
                  </div>
                  <div className="home-section">
                    <h3>
                      ตลาดหุ้น <span>บริษัทสมมติ</span>
                    </h3>
                    <span className="tag">4 บริษัท</span>
                  </div>
                  {STOCKS.map((st, i) => {
                    const pr = stockPrice(st.id, s.day),
                      before = stockPrice(st.id, Math.max(0, s.day - 30));
                    const pct = (pr / before - 1) * 100;
                    return (
                      <button
                        className="stock-row"
                        key={st.id}
                        onClick={() => {
                          setStock(st.id);
                          setPage("stock");
                        }}
                      >
                        <span className={"stock-logo logo-" + i}>
                          {i === 0 ? (
                            <Sun />
                          ) : i === 1 ? (
                            <Building2 />
                          ) : i === 2 ? (
                            <Zap />
                          ) : (
                            <Leaf />
                          )}
                        </span>
                        <span className="grow">
                          <b>{st.name}</b>
                          <small>
                            {st.id} · {s.holdings[st.id]?.qty ?? 0} หุ้น
                          </small>
                        </span>
                        <span className="stock-value">
                          <b>{money(pr, 2)}</b>
                          <small className={pct >= 0 ? "positive" : "negative"}>
                            {pct >= 0 ? "+" : ""}
                            {num(pct, 2)}% / 30 วันเกม
                          </small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    );
                  })}
                  {link(
                    <Coins />,
                    "เงินปันผล",
                    "ประมาณการและรายการที่รับแล้ว",
                    "dividends",
                  )}
                  {link(
                    <Clock3 />,
                    "ประวัติลงทุน",
                    "รายการซื้อ ขาย และปันผล",
                    "history",
                  )}
                  <div className="note">
                    <CircleHelp size={20} />
                    <p>
                      หุ้นขึ้นลงได้ ปันผลไม่รับประกัน
                      เงินที่ต้องใช้ซ่อมเครื่องไม่ควรเสี่ยงลงทุนทั้งหมด
                    </p>
                  </div>
                </>
              )}
              {tab === "city" && (
                <>
                  {header(
                    "A BRIGHTER TOMORROW",
                    "เมืองที่เติบโตไปกับเรา",
                    "จากหลังคาเล็ก ๆ สู่พลังงานของวันพรุ่งนี้",
                  )}
                  <FactoryArt
                    tier={s.highest}
                    night={night}
                    active={mainProducing}
                    reduced={s.reducedMotion}
                  />
                  <div className="stats">
                    {stat("กำลังติดตั้งรวม", power(capacity(s)))}
                    {stat("ผลิตสะสม", energy(s.totalProduced))}
                  </div>
                  <div className="timeline">
                    {TIERS.map((tier, i) => (
                      <button
                        key={tier.id}
                        className={
                          "timeline-item " + (i <= s.highest ? "done" : "")
                        }
                        onClick={() => {
                          if (i <= s.highest) {
                            const plant = s.plants.find((p) => p.tier === i);
                            if (plant) {
                              setSelected(plant.id);
                              setPage("detail");
                            }
                          } else
                            setPage(i <= s.unlocked ? "expand" : "project");
                        }}
                      >
                        <span className="timeline-dot">
                          {i <= s.highest ? (
                            <Check size={17} />
                          ) : (
                            <LockKeyhole size={15} />
                          )}
                        </span>
                        <div className="grow">
                          <span className="eyebrow">CHAPTER 0{i + 1}</span>
                          <h3>{tier.name}</h3>
                          <p>
                            {i <= s.highest
                              ? "เป็นส่วนหนึ่งของเมืองแล้ว"
                              : i <= s.unlocked
                                ? "พร้อมลงทุน"
                                : "รอคุณไปถึง"}
                          </p>
                        </div>
                        <Icon tier={i} />
                      </button>
                    ))}
                  </div>
                  {link(
                    <Flag />,
                    "เป้าหมายบทปัจจุบัน",
                    "เตรียมความพร้อมก่อนขยาย",
                    "project",
                  )}
                  {link(
                    <Leaf />,
                    "เทคโนโลยีพลังงาน",
                    "ดูเส้นทางความก้าวหน้า",
                    "research",
                  )}
                  {s.won && (
                    <div className="panel success">
                      <Flag />
                      <h2>คุณสร้างอนาคตสำเร็จแล้ว</h2>
                      <p>กิจการยังเดินต่อได้ ขอบคุณที่ดูแลเมืองนี้</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
        <nav className="bottom-nav" aria-label="เมนูหลัก">
          {[
            { id: "plant", label: "โรงไฟฟ้า", icon: <SolarIcon /> },
            { id: "business", label: "ธุรกิจ", icon: <Wallet /> },
            { id: "invest", label: "ลงทุน", icon: <ChartNoAxesCombined /> },
            { id: "city", label: "เมือง", icon: <Map /> },
          ].map((n) => (
            <button
              key={n.id}
              aria-current={tab === n.id && !page ? "page" : undefined}
              className={tab === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              {n.icon}
              <span>{n.label}</span>
              {tab === n.id && <i />}
            </button>
          ))}
        </nav>
      </div>
      <div className="desktop-footer">
        <span>MADE OF SUNSHINE & SMALL STEPS</span>
        <span>เกมจำลอง · ข้อมูลบันทึกในเครื่อง</span>
      </div>
      {hiddenFile}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div
            className="dialog"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              aria-label="ปิด"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <span className="dialog-icon">
              <ShieldCheck size={30} />
            </span>
            <h2 id="dialog-title">{modal.title}</h2>
            <p>{modal.body}</p>
            {modal.cost !== undefined && (
              <div className="dialog-ledger">
                <div className="line-item">
                  <span>{modal.cost < 0 ? "เงินรับ" : "ยอดชำระ"}</span>
                  <b>{money(Math.abs(modal.cost), 2)}</b>
                </div>
                <div className="line-item">
                  <span>เงินสดหลังทำ</span>
                  <b className={s.cash - modal.cost < 0 ? "negative" : ""}>
                    {money(s.cash - modal.cost, 2)}
                  </b>
                </div>
                {s.cash - modal.cost < s.reserve && (
                  <p className="negative">
                    เงินหลังทำต่ำกว่าเงินสำรอง {money(s.reserve)}
                  </p>
                )}
              </div>
            )}
            <button
              className={"btn full " + (modal.danger ? "coral" : "primary")}
              disabled={modal.cost !== undefined && modal.cost > s.cash}
              onClick={() =>
                modal.action ? act(modal.action) : modal.custom?.()
              }
            >
              ยืนยัน
              {modal.cost !== undefined && modal.cost > s.cash
                ? " · เงินไม่พอ"
                : ""}
            </button>
            <button className="text-btn full" onClick={() => setModal(null)}>
              กลับไปคิดอีกนิด
            </button>
          </div>
        </div>
      )}
      {offline && (
        <div className="overlay">
          <div
            className="dialog"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label="สรุประหว่างที่คุณพัก"
          >
            <Sun size={38} className="sun-icon" />
            <span className="eyebrow">WELCOME BACK, OWNER</span>
            <h2>
              แดดยังทำงาน
              <br />
              ระหว่างที่คุณพัก
            </h2>
            <p>
              จำลองไป {num(offline.elapsed / 3600000, 1)} ชั่วโมงจริง
              {offline.capped ? " (ครบเพดาน 24 ชั่วโมงแล้ว)" : ""}
            </p>
            <div className="dialog-ledger">
              <div className="line-item">
                <span>พลังงานที่ผลิต</span>
                <b>{energy(offline.energy)}</b>
              </div>
              <div className="line-item">
                <span>เงินสดเปลี่ยนแปลง</span>
                <b>{money(offline.cash, 2)}</b>
              </div>
            </div>
            <p className="fine">
              คำนวณรายรับ รายจ่าย และนโยบายอัตโนมัติร่วมกัน
            </p>
            <button
              className="btn primary full"
              onClick={() => setOffline(null)}
            >
              กลับมาดูแลกิจการ
            </button>
          </div>
        </div>
      )}
      {celebration && (
        <ActionCelebration
          key={celebration.id}
          event={celebration}
          reduced={s.reducedMotion}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress-block">
      <div className="line-item">
        <span>{label}</span>
        <b>{Math.round(Math.max(0, Math.min(1, value)) * 100)}%</b>
      </div>
      <div className="meter">
        <i style={{ width: Math.max(0, Math.min(1, value)) * 100 + "%" }} />
      </div>
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
// Service workers require HTTPS (localhost is permitted for local verification).
if (
  import.meta.env.PROD &&
  import.meta.env.VITE_NATIVE !== "true" &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Core game remains usable; cached offline shell is optional. */
    });
  });
}
