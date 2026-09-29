import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "demo.spec.ts",
  outputDir: "playwright-demo-results",
  workers: 2,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3102",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node --import ./tests/helpers/demo-runtime-guard.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102",
    url: "http://127.0.0.1:3102",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      SHADOWLINE_DEMO_MODE: "true",
      GEMINI_API_KEY: "",
      SHADOWLINE_CODEX_BIN: "/not-installed/codex",
    },
  },
});
