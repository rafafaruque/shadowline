import { expect, test } from "vitest";
import { app } from "@benchmark/app";

test("[critical:legacy-contract] unrelated query parameters do not opt into pagination", async () => {
  const response = await app.request("/customers?source=legacy-client");
  expect(response.status).toBe(200);
  expect(Array.isArray(await response.json())).toBe(true);
});
test.each([
  "page=0",
  "page=-1",
  "page=1.5",
  "page=hello",
  "page=",
  "pageSize=0",
  "pageSize=101",
  "pageSize=2.5",
  "pageSize=",
  "page=1&page=2",
  "pageSize=2&pageSize=3",
  "page=9007199254740991&pageSize=100",
])("invalid query %s returns the documented error", async (query) => {
  const response = await app.request(`/customers?${query}`);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "INVALID_PAGINATION" });
});
test("page beyond the dataset returns an empty page with the original total", async () => {
  const response = await app.request("/customers?page=20&pageSize=10");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    data: [],
    page: 20,
    pageSize: 10,
    total: 12,
  });
});
test("pagination does not mutate the shared dataset", async () => {
  await app.request("/customers?page=2&pageSize=5");
  const response = await app.request("/customers?page=1&pageSize=100");
  const body: { data: { id: string }[]; total: number } = await response.json();
  expect(body.total).toBe(12);
  expect(body.data.map((customer) => customer.id)).toEqual(
    Array.from({ length: 12 }, (_, i) => `cust_${i + 1}`),
  );
});
