import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests",
  testMatch: "browser.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "a54-layout",
      use: {
        viewport: { width: 412, height: 892 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "compact-android",
      use: {
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
