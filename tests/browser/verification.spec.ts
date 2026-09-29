import { expect, test } from "@playwright/test";

// Concurrent first-load route compilation can reload a page with an active
// benchmark request. Keep this development-server suite sequential.
test.describe.configure({ mode: "default" });

test("development controls execute both real patches and show distinct evidence", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/verification");
  await expect(
    page.getByRole("heading", { name: "Benchmark verification" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Evaluate breaking patch" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Completed pagination-breaking: FAILED.",
    { timeout: 30000 },
  );
  const result = page.getByRole("region", { name: "Actual benchmark result" });
  await expect(
    result.getByText("11 passed / 0 failed", { exact: true }),
  ).toBeVisible();
  await expect(
    result.getByText("14 passed / 2 failed", { exact: true }),
  ).toBeVisible();
  await expect(
    result.getByText("YES — existing API contract broken"),
  ).toBeVisible();
  await expect(result.getByText("Cleaned up", { exact: true })).toBeVisible();
  await result.locator("summary").filter({ hasText: "CONTRACT" }).click();
  await expect(
    result
      .getByText(
        "[critical:legacy-contract] no-parameter callers retain the exact Customer[] shape",
        { exact: false },
      )
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Evaluate compatible patch" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Completed pagination-compatible: PASSED.",
    { timeout: 30000 },
  );
  await expect(
    result.getByText("16 passed / 0 failed", { exact: true }),
  ).toBeVisible();
  await expect(result.getByText("NO", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Live benchmark evidence · aggregate dashboards remain fixtures",
    ),
  ).toBeVisible();
});

test("development endpoint rejects extra commands and cross-origin requests", async ({
  request,
}) => {
  const invalid = await request.post("/api/benchmark", {
    headers: { origin: "http://127.0.0.1:3101" },
    data: { patchId: "pagination-compatible", command: "echo unsafe" },
  });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await request.post("/api/benchmark", {
    headers: { origin: "https://example.test" },
    data: { patchId: "pagination-compatible" },
  });
  expect(crossOrigin.status()).toBe(403);
});

test("verification controls fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/verification");
  await expect(
    page.getByRole("button", { name: "Evaluate compatible patch" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("agent controls expose exact configurations without making a model call", async ({
  page,
  request,
}) => {
  await page.goto("/agent");
  await expect(
    page.getByRole("heading", { name: "Coding agent", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue(
    "gemini",
  );
  await page.getByLabel("Provider", { exact: true }).selectOption("codex-cli");
  await expect(
    page.getByText("Model:", { exact: true }).locator(".."),
  ).toContainText("Codex CLI");
  const runButton = page.getByRole("button", { name: "Run coding agent" });
  if (await runButton.isEnabled()) {
    // Intercept before clicking: browser tests must never spend a real inference.
    await page.route("**/api/agent", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        taskId: "customers-pagination",
        configId: "baseline",
        providerId: "codex-cli",
      });
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Browser mock: no provider invoked." }),
      });
    });
    await runButton.click();
    await expect(
      page.getByText("Browser mock: no provider invoked."),
    ).toBeVisible();
    await page.unroute("**/api/agent");
  }
  await page.getByLabel("Provider", { exact: true }).selectOption("gemini");
  await expect(
    page.getByText("tests/customers.test.ts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("docs/api-conventions.md", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Agent configuration").selectOption("context-rich");
  await expect(
    page.getByText("docs/api-conventions.md", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("src/lib/pagination.ts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Existing callers without pagination query parameters", {
      exact: false,
    }),
  ).toBeVisible();
  const invalid = await request.post("/api/agent", {
    headers: { origin: "http://127.0.0.1:3101" },
    data: {
      taskId: "customers-pagination",
      configId: "baseline",
      command: "unsafe",
    },
  });
  expect(invalid.status()).toBe(400);
  const unknownProvider = await request.post("/api/agent", {
    headers: { origin: "http://127.0.0.1:3101" },
    data: {
      taskId: "customers-pagination",
      configId: "baseline",
      providerId: "untrusted",
    },
  });
  expect(unknownProvider.status()).toBe(400);
  const crossOrigin = await request.post("/api/agent", {
    headers: { origin: "https://example.test" },
    data: { taskId: "customers-pagination", configId: "baseline" },
  });
  expect(crossOrigin.status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("saved real runs expose exact inputs and honest review evidence", async ({
  page,
}) => {
  await page.goto("/agent");
  const links = page.locator('a[href^="/agent/runs/"]');
  if ((await links.count()) === 0) {
    await expect(
      page.getByText("No real attempts recorded yet."),
    ).toBeVisible();
    return;
  }
  await links.first().click();
  await expect(
    page.getByRole("heading", { name: "Engineering decision" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What the agent knew" }),
  ).toBeVisible();
  await page
    .getByText("Exact system and user prompts", { exact: true })
    .click();
  await expect(
    page.getByText('"task": "Add pagination support to GET /customers."', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Live benchmark evidence · aggregate dashboards remain fixtures",
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
