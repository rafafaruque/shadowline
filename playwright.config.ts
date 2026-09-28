import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testMatch: "app.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "development-verification",
      testMatch: "verification.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3101" },
    },
  ],
  webServer: [
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
