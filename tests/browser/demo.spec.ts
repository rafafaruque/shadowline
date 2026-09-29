import { expect, test } from "@playwright/test";

const experiment = "/experiments/real/1ede9ceb-1c45-4d5f-9c39-9b638f65216d";
const baseline = "/agent/runs/4b299b77-b63f-4ee3-ae13-06c5e0d2f956";
const after = "/agent/runs/c0cc3ec2-68b7-43d6-8981-42728a91bd38";

test("hosted demo preserves all inspection views and labels real versus illustrative evidence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/engagement",
    "/runs",
    "/runs/SL-1042",
    "/experiments",
    "/architecture",
    "/agent",
    "/verification",
    "/experiments/real",
    experiment,
    baseline,
    after,
  ]) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Hosted demo")).toContainText("Recorded demo");
  }
  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recent experiment" });
  await expect(recent).toContainText("11/11 public · 16/16 contract");
  await recent
    .getByRole("link", { name: "View experiment →", exact: true })
    .click();
  await expect(page).toHaveURL(experiment);
  await page
    .getByText("View complete experiment evidence", { exact: true })
    .click();
  await expect(page.getByText("CONTEXT_GAP", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("table", {
      name: "Measured baseline versus context-rich evidence",
    }),
  ).toContainText("7 passed / 4 failed");
  await page
    .getByText("Approved intervention & rationale", { exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Intervention rationale" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Recorded intervention · read-only.", { exact: true }),
  ).toBeVisible();
  await page.goto("/engagement");
  await expect(
    page.getByRole("region", { name: "Illustrative ROI" }),
  ).toContainText("Customer assumptions, not benchmark-measured ROI.");
  expect(errors).toEqual([]);
});

test("all hosted mutation endpoints reject execution and file writes", async ({
  request,
  page,
}) => {
  const cases = [
    [
      "/api/agent",
      {
        taskId: "customers-pagination",
        configId: "baseline",
        providerId: "codex-cli",
      },
    ],
    ["/api/benchmark", { patchId: "pagination-compatible" }],
    ...["diagnose", "edit", "approve", "execute"].map((action) => [
      "/api/experiments",
      { action, id: experiment.split("/").at(-1) },
    ]),
  ] as const;
  for (const [url, data] of cases) {
    const response = await request.post(String(url), {
      data,
      headers: { origin: "http://127.0.0.1:3102" },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toContain(
      "disabled in the hosted demo",
    );
  }
  await page.goto("/agent");
  await expect(
    page.getByRole("button", { name: "Live coding-agent execution disabled" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveCount(0);
  await page.goto("/verification");
  await expect(
    page.getByRole("button", { name: "Run benchmark — local only" }),
  ).toBeDisabled();
  await page.goto("/experiments/real");
  await page
    .getByText("Failed baselines · diagnosis controls", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Diagnose & propose intervention" }),
  ).toBeDisabled();
});

test("recorded outages remain provider errors and evidence fits mobile", async ({
  page,
}) => {
  await page.goto("/agent/runs/051afcf9-379a-4ed2-8f2f-c4fb56ce15df");
  await expect(
    page.getByText("Provider unavailable · no coding outcome", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Excluded from coding failures/)).toBeVisible();
  await expect(page.locator("footer")).toContainText(
    "Recorded real benchmark evidence",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/engagement",
    "/architecture",
    experiment,
    baseline,
    after,
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("run filters preserve provider incidents without treating them as coding failures", async ({
  page,
}) => {
  await page.goto("/runs");
  const log = page.getByRole("region", { name: "Recorded runs" });
  await expect(log.getByRole("row")).toHaveCount(3);
  await page.getByLabel("Recorded result").selectOption("FAILED");
  await expect(log.getByRole("row")).toHaveCount(2);
  await expect(
    log.getByRole("cell", { name: "FAILED", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Recorded result").selectOption("PASSED");
  await expect(log.getByRole("row")).toHaveCount(2);
  await expect(
    log.getByRole("cell", { name: "PASSED", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Recorded result").selectOption("PROVIDER_ERROR");
  await expect(
    log.getByRole("cell", { name: "PROVIDER_ERROR", exact: true }),
  ).toHaveCount(6);
  await expect(
    log.getByRole("cell", { name: "Not evaluated", exact: true }),
  ).toHaveCount(6);
  await expect(
    log.getByText("Excluded from coding failures and acceptance rates.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("primary pages preserve navigation and fit desktop and mobile", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, route] of [
      "/",
      "/runs",
      "/experiments",
      "/engagement",
      "/architecture",
      experiment,
      baseline,
      after,
      "/runs/SL-1042",
      "/agent",
      "/verification",
    ].entries()) {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      await expect(nav.getByRole("link")).toHaveText([
        "Overview",
        "Runs",
        "Experiments",
        "Engagement",
        "Architecture",
      ]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`page-${index}-${width}.png`),
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`first-time recorded walkthrough stays read-only at ${width}px`, async ({
    page,
  }, testInfo) => {
    const mutations: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method()))
        mutations.push(`${request.method()} ${request.url()}`);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    const inspect = async (step: string) => {
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link"),
      ).toHaveText([
        "Overview",
        "Runs",
        "Experiments",
        "Engagement",
        "Architecture",
      ]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${step}.png`),
        fullPage: true,
      });
    };
    await page.goto("/");
    await expect(
      page.getByText("Test and improve coding-agent workflows.", {
        exact: true,
      }),
    ).toBeVisible();
    await inspect("01-home");
    await expect(
      page.locator("main").getByRole("heading", { level: 2 }),
    ).toHaveText(["Recent experiment", "Recent runs"]);
    await expect(
      page
        .getByRole("table", { name: "Recorded real runs" })
        .locator("tbody tr"),
    ).toHaveCount(2);
    await expect(
      page.locator("main").getByRole("region", { name: "Recommendation" }),
    ).toHaveCount(0);
    await expect(page.locator("#autonomy")).toHaveCount(0);
    await page
      .getByRole("link", { name: "Start experiment", exact: true })
      .click();
    await expect(page).toHaveURL("/experiments/new");
    await inspect("02-task");
    await page.getByRole("link", { name: "Continue →", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Agent setup", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("GPT-6 Astra", { exact: false })).toBeVisible();
    await page
      .getByRole("link", { name: /Context-rich.*Select setup/ })
      .click();
    await page.getByText("View context · 6 files", { exact: true }).click();
    await expect(
      page.locator("summary", { hasText: "docs/api-conventions.md" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Baseline.*Select setup/ }).click();
    await page.getByText("View context · 4 files", { exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Baseline configuration" })
        .locator("summary", { hasText: "docs/api-conventions.md" }),
    ).toHaveCount(0);
    await inspect("03-agent-setup");
    await page
      .getByRole("link", { name: "Open recorded run →", exact: true })
      .click();
    await expect(page).toHaveURL(baseline);
    await expect(
      page.getByText("Human review required", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/generated implementation used limit/),
    ).toBeVisible();
    await inspect("04-baseline");
    await page
      .locator("summary")
      .filter({ hasText: "View generated patch" })
      .click();
    const patch = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Patch", exact: true }),
    });
    await patch
      .locator("summary")
      .filter({ hasText: "src/routes/customers.ts" })
      .click();
    await expect(patch.locator("pre")).toContainText("limit");
    await page
      .getByRole("link", { name: "Diagnose failure →", exact: true })
      .click();
    await expect(page).toHaveURL(`${experiment}/diagnosis`);
    await expect(page.getByText("Context gap", { exact: true })).toBeVisible();
    await page.getByText("View diagnosis evidence", { exact: true }).click();
    await expect(
      page.getByText("View diagnosis evidence", { exact: true }).locator(".."),
    ).toContainText("API");
    await inspect("05-diagnosis");
    await page
      .getByRole("link", { name: "Review improved setup →", exact: true })
      .click();
    await expect(page).toHaveURL(`${experiment}/setup`);
    await expect(
      page.getByText("Approved in recorded experiment", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("docs/api-conventions.md", { exact: true }),
    ).toBeChecked();
    await expect(
      page.getByLabel("docs/api-conventions.md", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Approve intervention", exact: true }),
    ).toHaveCount(0);
    const approvedContext = page.getByRole("group", {
      name: "Context",
      exact: true,
    });
    await expect(approvedContext.getByRole("checkbox")).toHaveCount(6);
    for (const file of [
      "src/app.ts",
      "src/routes/customers.ts",
      "src/data/customers.ts",
      "tests/customers.test.ts",
      "docs/api-conventions.md",
      "src/lib/pagination.ts",
    ]) {
      await expect(
        approvedContext.getByLabel(file, { exact: true }),
      ).toBeChecked();
      await expect(
        approvedContext.getByLabel(file, { exact: true }),
      ).toBeDisabled();
    }
    await inspect("06-approved-setup");
    await page
      .getByRole("link", { name: "View recorded rerun →", exact: true })
      .click();
    await expect(page).toHaveURL(after);
    await expect(
      page.getByText("Accepted by benchmark checks", { exact: true }),
    ).toBeVisible();
    await inspect("07-rerun");
    await page
      .getByRole("link", { name: "Compare results →", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Experiment complete", exact: true }),
    ).toBeVisible();
    const result = page.getByRole("table", {
      name: "Experiment result",
      exact: true,
    });
    for (const value of [
      "7 / 11",
      "11 / 11",
      "2 / 16",
      "16 / 16",
      "19.429 s",
      "11.187 s",
      "3,720",
      "4,221",
    ])
      await expect(
        result.getByRole("cell", { name: value, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recommendation" }),
    ).toContainText("Keep human review enabled");
    await expect(
      page.getByRole("region", { name: "Recommendation" }),
    ).toContainText("20–30");
    await inspect("08-comparison");
    await page
      .getByText("View complete experiment evidence", { exact: true })
      .click();
    await page.getByText("View raw evidence", { exact: true }).click();
    await expect(
      page.getByText("View raw evidence", { exact: true }).locator(".."),
    ).toContainText("proposalSha256");
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
