import { expect, test } from "@playwright/test";
import { loadEngagementEvidence } from "../../lib/engagement/evidence";

test("engagement keeps measured evidence separate from the pilot and illustrative ROI", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Engagement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Northstar Software", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Customer workflow" }).getByRole("listitem"),
  ).toHaveCount(6);
  await expect(
    page
      .getByRole("region", { name: "Customer requirements" })
      .locator("tbody tr"),
  ).toHaveCount(6);
  const saved = await loadEngagementEvidence();
  const measured = page.getByRole("region", { name: "Real experiment" });
  if (saved.available) {
    const counts = (
      suite: { passed: number; failed: number; skipped: number } | undefined,
    ) =>
      suite
        ? `${suite.passed} / ${suite.passed + suite.failed + suite.skipped}`
        : "Not evaluated";
    for (const [label, key] of [
      ["Public", "publicTests"],
      ["Contract", "contractTests"],
    ] as const) {
      const row = measured.getByRole("row").filter({
        has: page.getByRole("rowheader", { name: label, exact: true }),
      });
      await expect(row.getByRole("cell")).toHaveText([
        counts(saved.baseline.evaluation?.[key]),
        counts(saved.after.evaluation?.[key]),
      ]);
    }
  } else await expect(measured).toContainText("Saved experiment unavailable");
  await expect(
    page.getByRole("region", { name: "Recommended pilot policy" }),
  ).toContainText("LIGHT HUMAN REVIEW — PILOT");
  const roi = page.getByRole("region", { name: "Illustrative ROI" });
  await expect(roi).toContainText("15 hrs/month");
  await expect(roi).toContainText(
    "Customer assumptions, not benchmark-measured ROI.",
  );
  await roi.getByText("Assumptions & calculation").click();
  await expect(roi).toContainText("210 agent tasks/month");
  await expect(roi).toContainText("23% meaningful rework");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("every route and fixture run renders without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/runs",
    "/experiments",
    ...Array.from({ length: 12 }, (_, index) => `/runs/SL-${1032 + index}`),
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("footer")).toContainText(
      route.startsWith("/runs/")
        ? "Illustrative fixture"
        : "Recorded evidence · illustrative sections labeled separately",
    );
  }
  expect(errors).toEqual([]);
});

test("filters work together and can recover from an empty result", async ({
  page,
}) => {
  await page.goto("/runs");
  await page
    .getByText("Illustrative runs · 12 fixtures", { exact: true })
    .click();
  const fixtures = page.locator("details").filter({
    has: page.locator("summary", {
      hasText: "Illustrative runs · 12 fixtures",
    }),
  });
  await page.getByRole("textbox", { name: "Search runs" }).fill("pagination");
  await expect(fixtures.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Filter by result").selectOption("FAILED");
  await expect(fixtures.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Filter by category").selectOption("DATABASE_CHANGE");
  await expect(page.getByText("No matching runs")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(fixtures.locator("tbody tr")).toHaveCount(12);
});

test("illustrative detail retains contract failure, exact inputs, disabled action, and improved fixture", async ({
  page,
}) => {
  await page.goto("/experiments");
  await page.getByText("Illustrative data · EXP-004", { exact: true }).click();
  await page.getByRole("link", { name: "Baseline fixture →" }).click();
  await expect(page).toHaveURL(/\/runs\/SL-1042$/);
  await expect(
    page.getByText(
      "Existing callers expected Customer[], but the agent changed the endpoint to return { data, page, pageSize, total }.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByText("Intervention · illustrative", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply intervention & rerun" }),
  ).toBeDisabled();
  await expect(page.getByText("None supplied · task title only")).toBeVisible();
  await page
    .getByRole("link", { name: /Inspect the improved fixture/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Required checks passed" }),
  ).toBeVisible();
});

test("homepage stays focused on activity and unknown IDs show a useful 404", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator("main").getByRole("heading", { level: 2 }),
  ).toHaveText(["Recent experiment", "Recent runs"]);
  await expect(page.locator("#autonomy")).toHaveCount(0);
  const response = await page.goto("/runs/not-a-real-run");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("link", { name: "Browse benchmark runs" }),
  ).toBeVisible();
});

test("mobile pages fit the viewport and preserve navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/runs", "/runs/SL-1042", "/experiments"]) {
    await page.goto(route);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("execution controls and endpoint are disabled in production", async ({
  page,
  request,
}) => {
  expect((await page.goto("/verification"))?.status()).toBe(404);
  const response = await request.post("/api/benchmark", {
    data: { patchId: "pagination-compatible" },
  });
  expect(response.status()).toBe(404);
});

test("real agent execution is unavailable in production", async ({
  request,
}) => {
  expect((await request.get("/agent")).status()).toBe(404);
  expect((await request.get("/experiments/real")).status()).toBe(404);
  expect(
    (
      await request.post("/api/experiments", {
        data: {
          action: "diagnose",
          baselineRunId: "00000000-0000-4000-8000-000000000000",
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/agent", {
        data: { taskId: "customers-pagination", configId: "baseline" },
      })
    ).status(),
  ).toBe(404);
});
