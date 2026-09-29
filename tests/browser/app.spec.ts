import { expect, test } from "@playwright/test";
import { loadEngagementEvidence } from "../../lib/engagement/evidence";

test("customer engagement separates saved evidence, assumptions, and the pilot policy", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("link", { name: /Customer engagement — Northstar Software/ })
    .click();
  await expect(page).toHaveURL(/\/engagement$/);
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
  const assumptions = page.getByRole("region", {
    name: "Illustrative business assumptions — not measured by Shadowline",
  });
  for (const value of ["210", "63", "23%"])
    await expect(assumptions.getByText(value, { exact: true })).toBeVisible();
  const measured = page.getByRole("region", {
    name: "Real measured experiment",
  });
  const saved = await loadEngagementEvidence();
  if (saved.available) {
    const row = (name: string) =>
      measured
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
    await expect(row("Overall result").getByRole("cell")).toHaveText([
      saved.baseline.status,
      saved.after.status,
    ]);
    for (const [label, key] of [
      ["Public tests", "publicTests"],
      ["Contract tests", "contractTests"],
    ] as const) {
      const counts = [saved.baseline, saved.after].map(
        (run) => run.evaluation?.[key],
      );
      await expect(row(label).getByRole("cell")).toHaveText(
        counts.map((value) =>
          value
            ? `${value.passed} passed / ${value.failed} failed`
            : "Not evaluated",
        ),
      );
    }
    await expect(
      row("Total coding-attempt runtime").getByRole("cell"),
    ).toHaveText(
      [saved.baseline, saved.after].map(
        (run) => `${(run.durationMs / 1000).toFixed(3)}s`,
      ),
    );
    await expect(row("Token usage").getByRole("cell")).toHaveText(
      [saved.baseline, saved.after].map((run) =>
        run.tokenUsage
          ? `${run.tokenUsage.total.toLocaleString("en-US")} tokens`
          : "Not available",
      ),
    );
    await expect(
      measured.getByText(/Same task · same provider\/model/),
    ).toBeVisible();
  } else {
    await expect(
      measured.getByText(/Saved experiment unavailable/),
    ).toBeVisible();
    await expect(measured.getByRole("table")).toHaveCount(0);
  }
  const policy = page.getByRole("region", {
    name: "Recommended Production Policy",
  });
  await expect(
    policy.getByText("LIGHT HUMAN REVIEW — PILOT", { exact: true }),
  ).toBeVisible();
  await expect(
    policy.getByText("Do not automatically merge production changes.", {
      exact: true,
    }),
  ).toBeVisible();
  const roi = page.getByRole("region", { name: "Illustrative ROI" });
  await expect(
    roi.getByText("≈ 15 engineering hours / month", { exact: true }),
  ).toBeVisible();
  await expect(
    roi.getByText("Not measured savings", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("footer")).toContainText(
    "Illustrative customer assumptions · saved real benchmark evidence",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
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
    await expect(
      page.getByText("All results are illustrative fixtures"),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("filters work together and can recover from an empty result", async ({
  page,
}) => {
  await page.goto("/runs");
  await page.getByRole("textbox", { name: "Search runs" }).fill("pagination");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Filter by result").selectOption("FAILED");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Filter by category").selectOption("DATABASE_CHANGE");
  await expect(page.getByText("No matching runs")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
});

test("hero flow exposes the contract failure, exact inputs, disabled action, and improved fixture", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Inspect failure & intervention" })
    .click();
  await expect(page).toHaveURL(/\/runs\/SL-1042$/);
  await expect(
    page.getByText(
      "Existing callers expected Customer[], but the agent changed the endpoint to return { data, page, pageSize, total }.",
      { exact: true },
    ),
  ).toBeVisible();
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

test("autonomy evidence is accessible and unknown IDs show a useful 404", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("summary").filter({ hasText: "Database changes" }).click();
  await expect(
    page.getByText(
      "High-impact work requires human ownership. 2 critical failure(s) in the evidence window.",
    ),
  ).toBeVisible();
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
