import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("real experiment keeps hypothesis, editable proposal, approval, and execution separate", async ({
  page,
  request,
}) => {
  await page.goto("/experiments/real");
  await expect(
    page.getByRole("heading", { name: "Real intervention experiments" }),
  ).toBeVisible();
  const link = page.locator('a[href^="/experiments/real/"]').first();
  if (await link.count()) {
    const href = (await link.getAttribute("href"))!;
    const id = href.split("/").at(-1)!;
    const filename = `.shadowline/experiments/${id}.json`;
    const original = await readFile(filename, "utf8");
    let mock = JSON.parse(original);
    const actions: string[] = [];
    // Never perform real approvals, provider calls, or record mutations in browser tests.
    await page.route("**/api/experiments", async (route) => {
      const body = route.request().postDataJSON();
      actions.push(body.action);
      if (body.action === "edit")
        mock = {
          ...mock,
          revision: mock.revision + 1,
          status: "DRAFT",
          approval: null,
          intervention: { ...mock.intervention, draft: body.draft },
        };
      if (body.action === "approve")
        mock = {
          ...mock,
          revision: mock.revision + 1,
          status: "APPROVED",
          approval: {
            proposalSha256: mock.intervention.sha256,
            approvedAt: new Date().toISOString(),
            source: "UI",
            actor: "Local engineer",
          },
        };
      if (body.action === "execute")
        mock = { ...mock, revision: mock.revision + 1, status: "COMPLETE" };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mock),
      });
    });
    await link.click();
    for (const name of [
      "What failed?",
      "What might have caused it?",
      "Did the intervention help?",
      "What should the engineer learn?",
    ])
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /What (will|did) we change\?/ }),
    ).toBeVisible();
    await expect(
      page.getByText("AI HYPOTHESIS — NOT A VERDICT", { exact: false }),
    ).toBeVisible();
    if (mock.status === "DRAFT") {
      const approve = page.getByRole("button", {
        name: "Approve intervention",
        exact: true,
      });
      await expect(approve).toBeDisabled();
      await page
        .getByLabel("Intervention rationale", { exact: true })
        .fill("Browser-only edit; no real record is changed.");
      await expect(approve).toBeDisabled();
      await page
        .getByRole("button", { name: "Save intervention changes" })
        .click();
      await page
        .getByLabel(
          "I reviewed this exact proposal and approve one context-rich attempt.",
          { exact: true },
        )
        .check();
      await approve.click();
      const execute = page.getByRole("button", {
        name: "Run one approved attempt",
        exact: true,
      });
      await expect(execute).toBeEnabled();
      expect(actions).toEqual(["edit", "approve"]);
      await execute.click();
      await expect(
        page.getByText("This experiment cannot start another attempt.", {
          exact: false,
        }),
      ).toBeVisible();
      expect(actions).toEqual(["edit", "approve", "execute"]);
    }
    await expect(
      page.getByRole("table", {
        name: "Measured baseline versus context-rich evidence",
      }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(await readFile(filename, "utf8")).toBe(original);
  } else
    await expect(
      page.getByText("No real experiments recorded yet."),
    ).toBeVisible();
  const headers = { origin: "http://127.0.0.1:3101" };
  expect(
    (
      await request.post("/api/experiments", {
        headers,
        data: {
          action: "execute",
          id: "00000000-0000-4000-8000-000000000000",
          proposalSha256: "a".repeat(64),
          command: "unsafe",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/experiments", {
        headers: { origin: "https://example.test" },
        data: {
          action: "diagnose",
          baselineRunId: "00000000-0000-4000-8000-000000000000",
        },
      })
    ).status(),
  ).toBe(403);
});
