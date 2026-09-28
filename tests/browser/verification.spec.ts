import { expect, test } from "@playwright/test";

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
