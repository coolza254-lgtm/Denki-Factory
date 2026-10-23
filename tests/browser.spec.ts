import { fixturePath } from "../scripts/fixture-path";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { initialGame, SAVE_KEY, PEDAL_KWH, type Game } from "../src/sim";
const fixture = (name: string) =>
  JSON.parse(readFileSync(fixturePath(name), "utf8")) as Game;
const bootstrapInstalled = new WeakSet<Page>();
async function seed(page: Page, s: Game) {
  if (!bootstrapInstalled.has(page)) {
    await page.addInitScript(
      ({ key }) => {
        const pending = sessionStorage.getItem("denki-test-seed");
        if (pending) {
          const state = JSON.parse(pending);
          state.lastAt = Date.now();
          localStorage.setItem(key, JSON.stringify(state));
          sessionStorage.removeItem("denki-test-seed");
        }
      },
      { key: SAVE_KEY },
    );
    bootstrapInstalled.add(page);
  }
  await page.goto("/");
  // Apply after the previous page's pagehide save, before the new app reads storage.
  await page.evaluate(
    (s) => sessionStorage.setItem("denki-test-seed", JSON.stringify(s)),
    s,
  );
  await page.reload();
}
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("updater requires a click, shows download progress, and hands installation to Android", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let state = {
      status: "idle",
      message: "พร้อมตรวจสอบ",
      currentVersion: "0.4.0",
    };
    const emit = (status: string, message: string) => {
      state = { ...state, status, message };
      window.dispatchEvent(new CustomEvent("denki-update", { detail: state }));
    };
    window.DenkiAndroid = {
      saveJson: () => {},
      getUpdateState: () => JSON.stringify(state),
      checkForUpdate: () => {
        document.documentElement.dataset.updateChecked = "yes";
        emit("checking", "กำลังตรวจสอบ…");
      },
      downloadUpdate: () => emit("downloading", "กำลังดาวน์โหลด…"),
      installUpdate: () =>
        emit(
          "permission",
          "อนุญาตติดตั้งจาก Denki Factory แล้วกลับมากดติดตั้งอีกครั้ง",
        ),
    };
  });
  await seed(page, initialGame());
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  const panel = page.getByRole("region", { name: "อัปเดตเกม" });
  await expect(panel.getByText("รุ่นที่ติดตั้ง 0.4.0")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.dataset.updateChecked),
  ).toBeUndefined();
  await panel.getByRole("button", { name: "ตรวจสอบอัปเดต" }).click();
  await expect(panel.getByRole("button")).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("denki-update", {
        detail: {
          status: "available",
          message: "มีรุ่นใหม่",
          version: "0.5.0",
          bytes: 1024,
          notes: "<script>bad()</script>",
        },
      }),
    ),
  );
  await panel.getByRole("button", { name: "ดาวน์โหลดอัปเดต" }).click();
  await expect(panel.getByRole("progressbar")).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("denki-update", {
        detail: { status: "ready", message: "ตรวจสอบแล้ว พร้อมติดตั้ง" },
      }),
    ),
  );
  await panel.getByRole("button", { name: "ติดตั้งอัปเดต" }).click();
  await expect(panel.getByRole("status")).toContainText("อนุญาตติดตั้ง");
  await expect(
    panel.getByRole("button", { name: "ติดตั้งอัปเดต" }),
  ).toBeEnabled();
});
test("updater handles offline errors and restores current-version state on revisiting settings", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.DenkiAndroid = {
      saveJson: () => {},
      getUpdateState: () =>
        JSON.stringify({
          status: "error",
          message: "ตรวจสอบไม่ได้ กรุณาเช็กอินเทอร์เน็ตแล้วลองใหม่",
        }),
      checkForUpdate: () => {},
    };
  });
  await seed(page, initialGame());
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("เช็กอินเทอร์เน็ต");
  await expect(
    page.getByRole("button", { name: "ตรวจสอบอัปเดต" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    window.DenkiAndroid!.getUpdateState = () =>
      JSON.stringify({
        status: "current",
        message: "คุณใช้รุ่นล่าสุดแล้ว",
        currentVersion: "0.4.0",
      });
  });
  await nav(page, "โรงไฟฟ้า");
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("คุณใช้รุ่นล่าสุดแล้ว");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("browser updater links to the Android release without requesting install permissions", async ({
  page,
}) => {
  await seed(page, initialGame());
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "ดาวน์โหลดรุ่น Android" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/coolza254-lgtm/Denki-Factory/releases/latest",
  );
  await expect(page.getByRole("button", { name: "ติดตั้งอัปเดต" })).toHaveCount(
    0,
  );
});
test("tap bike sells power, keeps progress on reload, and honors reduced motion", async ({
  page,
}) => {
  const state = initialGame();
  state.day = 0;
  await seed(page, state);
  const bike = page.getByRole("button", { name: "แตะปั่นไฟขาย", exact: true });
  await bike.click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).totalProduced,
        SAVE_KEY,
      ),
    )
    .toBeCloseTo(PEDAL_KWH, 8);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.cash).toBeCloseTo(PEDAL_KWH * 3.2, 8);
  expect(saved.plants[0].produced).toBe(0);
  await page.reload();
  await expect(bike).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).pedalLastAt,
      SAVE_KEY,
    ),
  ).toBe(saved.pedalLastAt);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await bike.click();
  await expect(page.locator(".pedal-wheel").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("new owner can start, visit every tab, open details, and reload saved game", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("textbox").fill("บ้านแดดดี");
  await page.getByRole("button", { name: "เปิดกิจการของฉัน" }).click();
  await expect(page.getByText("บ้านแดดดี", { exact: true })).toBeVisible();
  for (const tab of ["ธุรกิจ", "ลงทุน", "เมือง", "โรงไฟฟ้า"]) {
    await nav(page, tab);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "ดูทั้งหมด" }).click();
  await page.getByRole("button", { name: /โซลาร์หลังบ้าน/ }).click();
  await expect(
    page.getByRole("heading", { name: "โซลาร์หลังบ้าน", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /บำรุงรักษา/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("บ้านแดดดี", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("borrow, buy shares, and sell with real state changes", async ({
  page,
}) => {
  await seed(page, initialGame());
  await nav(page, "ธุรกิจ");
  await page.getByRole("button", { name: /สินเชื่อธุรกิจ/ }).click();
  await page.getByRole("button", { name: "ตรวจสอบและกู้เงิน" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).loans.length,
        SAVE_KEY,
      ),
    )
    .toBe(1);
  await nav(page, "ลงทุน");
  await page.getByRole("button", { name: /สุริยา โซลาร์/ }).click();
  await page.getByRole("button", { name: "ซื้อหุ้น", exact: true }).click();
  await page.getByRole("spinbutton").fill("10");
  await page.getByRole("button", { name: "ตรวจสอบการซื้อ" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).holdings.SURY.qty,
        SAVE_KEY,
      ),
    )
    .toBe(10);
  await nav(page, "ลงทุน");
  await page.getByRole("button", { name: /สุริยา โซลาร์/ }).click();
  await page.getByRole("button", { name: "ขายหุ้น", exact: true }).click();
  await page.getByRole("spinbutton").fill("4");
  await page.getByRole("button", { name: "ตรวจสอบการขาย" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).holdings.SURY.qty,
        SAVE_KEY,
      ),
    )
    .toBe(6);
});
test("mission pays once, purchase confirmed, back navigation works", async ({
  page,
}) => {
  const s = fixture("early");
  s.cash = 10000;
  await seed(page, s);
  await page.getByRole("button", { name: "เป้าหมาย", exact: true }).click();
  await page.getByRole("button", { name: "รับทุน ฿500", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "รับทุนแล้ว", exact: true }),
  ).toHaveCount(1);
  await nav(page, "โรงไฟฟ้า");
  await page.getByRole("button", { name: "ขยายกิจการ", exact: true }).click();
  await page
    .getByRole("button", { name: "ลงทุนโครงการนี้", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).plants.length,
        SAVE_KEY,
      ),
    )
    .toBe(2);
  await page.goBack();
  await expect(page.locator(".home-intro h1")).toBeVisible();
});
test("business pages, policies, city, and investment subpages are reachable", async ({
  page,
}) => {
  await seed(page, fixture("established"));
  for (const label of [
    "กระแสเงินสด",
    "ผลประกอบการ",
    "สมุดเงินสด",
    "สัญญาขายไฟ",
    "สินเชื่อธุรกิจ",
    "ภาษีและกำหนดชำระ",
    "นโยบายอัตโนมัติ",
  ]) {
    await nav(page, "ธุรกิจ");
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await expect(page.locator("main h2").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("spinbutton").fill("2000");
  await page.getByRole("button", { name: "บันทึกเงินสำรอง" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).reserve,
        SAVE_KEY,
      ),
    )
    .toBe(2000);
  await nav(page, "เมือง");
  await page.getByRole("button", { name: /เป้าหมายบทปัจจุบัน/ }).click();
  await expect(
    page.getByRole("heading", { name: "ฟาร์มกังหันลม" }),
  ).toBeVisible();
  await nav(page, "ลงทุน");
  await page.getByRole("button", { name: /เงินปันผล/ }).click();
  await expect(
    page.getByRole("heading", { name: "รายได้จากเงินที่พักไว้" }),
  ).toBeVisible();
});
test("save export, validated import, and corrupt-save recovery", async ({
  page,
}) => {
  await seed(page, fixture("early"));
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  await page.getByRole("button", { name: /บันทึกและสำรอง/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ส่งออกไฟล์สำรอง" }).click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/denki-save/);
  await page.locator("input[type=file]").setInputFiles({
    name: "denki.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture("established"))),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).highest,
        SAVE_KEY,
      ),
    )
    .toBe(3);
  await page.addInitScript(
    (key) => localStorage.setItem(key, '{"version":1}'),
    SAVE_KEY,
  );
  await page.reload();
  await expect(page.getByText(/ไฟล์บันทึกไม่สมบูรณ์/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "เปิดกิจการของฉัน" }),
  ).toBeVisible();
});
test("completed nuclear project is playable and displays victory", async ({
  page,
}, info) => {
  await seed(page, fixture("nuclear"));
  await nav(page, "เมือง");
  await expect(
    page.getByRole("heading", { name: "คุณสร้างอนาคตสำเร็จแล้ว" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /เป้าหมายบทปัจจุบัน/ }).click();
  await expect(
    page.getByRole("heading", { name: "จากแผงแรก สู่นิวเคลียร์" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-nuclear.png`,
    fullPage: true,
  });
});
test("production shell opens offline after service worker installation", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "เปิดกิจการของฉัน" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "เปิดกิจการของฉัน" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "เปิดกิจการของฉัน" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("electricity flows only during actual production; reduced motion stops effects", async ({
  page,
}) => {
  const s = initialGame();
  s.day = 0.5;
  s.cash = 1000;
  await seed(page, s);
  const art = page.locator(".scene-wrap .factory-art");
  const current = art.locator(".electric-current");
  await expect(art).toHaveAttribute("data-producing", "true");
  await expect(art).toHaveClass(/motion-running/);
  const before = await current.evaluate(
    (el) => getComputedStyle(el).strokeDashoffset,
  );
  await expect
    .poll(() => current.evaluate((el) => getComputedStyle(el).strokeDashoffset))
    .not.toBe(before);
  await page.getByRole("button", { name: "ตั้งค่า", exact: true }).click();
  await page.getByRole("checkbox").check();
  await nav(page, "โรงไฟฟ้า");
  await expect(page.locator(".scene-wrap .factory-art")).toHaveClass(
    /motion-paused/,
  );
  await expect
    .poll(() =>
      page
        .locator(".scene-wrap .electric-current")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  const resting = initialGame();
  resting.day = 0.95;
  await seed(page, resting);
  await expect(page.locator(".scene-wrap .factory-art")).toHaveAttribute(
    "data-producing",
    "false",
  );
  await expect
    .poll(() =>
      page
        .locator(".scene-wrap .electric-current")
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("0");
  const repair = initialGame();
  repair.day = 0.5;
  repair.plants[0].repairUntil = 5;
  await seed(page, repair);
  await expect(page.locator(".scene-wrap .factory-art")).toHaveAttribute(
    "data-producing",
    "false",
  );
});

test("rolling balance settles to the exact amount without creating extra income", async ({
  page,
}) => {
  await page.clock.install();
  const s = initialGame();
  s.cash = 1000;
  await seed(page, s);
  const cash = page.locator(".money-bar .rolling-number");
  await page.clock.runFor(11200);
  await expect
    .poll(async () => Number(await cash.getAttribute("data-value")))
    .toBeGreaterThan(1000);
  await page.clock.runFor(1500);
  await expect
    .poll(async () => await cash.textContent())
    .toBe(await cash.getAttribute("aria-label"));
  // Saving after the tween must store the simulation target, never its intermediate frames.
  await page.clock.runFor(3000);
  const actual = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).cash,
    SAVE_KEY,
  );
  expect(Number(await cash.getAttribute("data-value"))).toBeCloseTo(actual, 8);
});

test("system reduced-motion preference is respected and reward feedback does not block taps", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const s = fixture("early");
  await seed(page, s);
  await expect(page.locator(".scene-wrap .factory-art")).toHaveClass(
    /motion-paused/,
  );
  await page.getByRole("button", { name: "เป้าหมาย", exact: true }).click();
  await page.getByRole("button", { name: "รับทุน ฿500", exact: true }).click();
  await expect(page.locator(".action-celebration")).toHaveClass(/still/);
  expect(
    await page
      .locator(".action-celebration")
      .evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");
  await nav(page, "โรงไฟฟ้า");
  await expect(page.locator(".money-bar .rolling-number")).toHaveText(
    (await page
      .locator(".money-bar .rolling-number")
      .getAttribute("aria-label")) ?? "",
  );
});

test("small wind shop purchases persist, production is visible at night, and motion can stop", async ({
  page,
}, info) => {
  const state = initialGame();
  state.cash = 1500;
  state.day = 2;
  await seed(page, state);
  await page.getByRole("button", { name: "เพิ่มพลังงานเล็ก ๆ" }).click();
  await expect(
    page.getByRole("heading", { name: "ให้แดดกับลมช่วยทำงาน" }),
  ).toBeVisible();
  const purchase = page.getByRole("button", {
    name: "ซื้อ กังหันลมมือสอง 200 W",
    exact: true,
  });
  await page.screenshot({
    path: `test-results/${info.project.name}-small-shop-preview.png`,
    fullPage: true,
  });
  await purchase.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยัน", exact: true })
    .click();
  await expect(page.getByText("มีแล้ว 1 ชุด", { exact: true })).toBeVisible();
  await expect(purchase).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-small-shop.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: /กังหันลมมือสอง 200 W/ }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.plants[1].equipment).toBe("breeze");
  saved.day = 3;
  saved.plants[1].repairUntil = 0;
  await seed(page, saved);
  const rotor = page.locator(".scene-wrap .yard-wind .little-rotor");
  await expect(page.locator(".scene-wrap .factory-art")).toHaveAttribute(
    "data-producing",
    "true",
  );
  await expect(rotor).toHaveCSS("animation-play-state", "running");
  await page.screenshot({
    path: `test-results/${info.project.name}-wind-night.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rotor).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: /กังหันลมมือสอง 200 W/ }).click();
  await expect(
    page.getByRole("heading", { name: "กังหันลมมือสอง 200 W", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("ลมบริเวณนี้")).toBeVisible();
});
