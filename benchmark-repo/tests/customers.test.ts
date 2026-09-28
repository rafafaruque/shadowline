import { expect, test } from "vitest";
import { app } from "../src/app";

test("the customer endpoint responds successfully", async () => {
  const response = await app.request("/customers");
  expect(response.status).toBe(200);
});
test("customers are served as JSON", async () => {
  const response = await app.request("/customers");
  expect(response.headers.get("content-type")).toContain("application/json");
});
test("unknown endpoints are not found", async () => {
  expect((await app.request("/missing")).status).toBe(404);
});
