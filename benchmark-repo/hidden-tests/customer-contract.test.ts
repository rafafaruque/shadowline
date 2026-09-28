import { expect, test } from "vitest";
import { app } from "@benchmark/app";

// The runner classifies failed assertions with this explicit marker as critical.
test("[critical:legacy-contract] no-parameter callers retain the exact Customer[] shape", async () => {
  const response = await app.request("/customers");
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  expect(
    Array.isArray(body),
    "Existing callers require an unwrapped Customer[]",
  ).toBe(true);
  if (!Array.isArray(body)) throw new Error("Customer[] contract violated");
  expect(body).toHaveLength(12);
  expect(body[0]).toEqual({
    id: "cust_1",
    name: "Acme Corp",
    email: "ops@acme.test",
  });
  for (const customer of body)
    expect(Object.keys(customer).sort()).toEqual(["email", "id", "name"]);
  expect(body.map((customer: { id: string }) => customer.id)).toEqual(
    Array.from({ length: 12 }, (_, i) => `cust_${i + 1}`),
  );
});
