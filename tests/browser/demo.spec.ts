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
    await expect(
      page.getByRole("complementary", { name: "Hosted demo" }),
    ).toContainText("Live agent execution is disabled in the hosted demo.");
  }
  await page.goto("/engagement");
  const measured = page.getByRole("region", {
    name: "Real measured experiment",
  });
  await expect(
    measured.getByRole("cell", { name: "7 passed / 4 failed", exact: true }),
  ).toBeVisible();
  await expect(
    measured.getByRole("cell", { name: "16 passed / 0 failed", exact: true }),
  ).toBeVisible();
  for (const value of ["19.429s", "11.187s", "3,720 tokens", "4,221 tokens"])
    await expect(
      measured.getByRole("cell", { name: value, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Illustrative ROI" }),
  ).toContainText("Not measured savings");
  await measured
    .getByText("Inspect saved evidence and measurement boundaries")
    .click();
  await measured
    .getByRole("link", { name: "Inspect the original experiment" })
    .click();
  await expect(page).toHaveURL(experiment);
  await expect(
    page.getByRole("textbox", { name: "Intervention rationale" }),
  ).toBeDisabled();
  await expect(page.getByText("CONTEXT GAP", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Recorded intervention — editing, approval, and execution are disabled in the hosted demo.",
    ),
  ).toBeVisible();
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
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.goto("/verification");
  await expect(
    page.getByRole("button", { name: "Run benchmark — local only" }),
  ).toBeDisabled();
  await page.goto("/experiments/real");
  await expect(
    page.getByRole("button", { name: "Diagnose & propose intervention" }),
  ).toBeDisabled();
});

test("recorded outages remain provider errors and evidence fits mobile", async ({
  page,
}) => {
  await page.goto("/agent/runs/051afcf9-379a-4ed2-8f2f-c4fb56ce15df");
  await expect(
    page.getByRole("heading", {
      name: "Provider unavailable · no coding outcome",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Excluded from coding-agent failures/),
  ).toBeVisible();
  await expect(page.getByText(/recorded real evidence/i)).toBeVisible();
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
