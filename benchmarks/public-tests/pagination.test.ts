import { expect, test } from "vitest";
import { app } from "@benchmark/app";

// Public task acceptance tests supplied alongside either controlled patch.
test("explicit pagination returns the requested slice", async () => {
  const response = await app.request("/customers?page=2&pageSize=5");
  expect(response.status).toBe(200);
  const body: {
    data: { id: string }[];
    page: number;
    pageSize: number;
    total: number;
  } = await response.json();
  expect(body.data.map((customer) => customer.id)).toEqual([
    "cust_6",
    "cust_7",
    "cust_8",
    "cust_9",
    "cust_10",
  ]);
  expect({
    page: body.page,
    pageSize: body.pageSize,
    total: body.total,
  }).toEqual({ page: 2, pageSize: 5, total: 12 });
});
test("the last page contains only remaining customers", async () => {
  const response = await app.request("/customers?page=3&pageSize=5");
  const body: { data: { id: string }[] } = await response.json();
  expect(response.status).toBe(200);
  expect(body.data.map((customer) => customer.id)).toEqual([
    "cust_11",
    "cust_12",
  ]);
});
test("page alone uses the default page size", async () => {
  const response = await app.request("/customers?page=2");
  const body: { data: unknown[]; pageSize: number } = await response.json();
  expect(response.status).toBe(200);
  expect(body.pageSize).toBe(10);
  expect(body.data).toHaveLength(2);
});
test("pageSize alone starts on the first page", async () => {
  const response = await app.request("/customers?pageSize=3");
  const body: { data: unknown[]; page: number } = await response.json();
  expect(response.status).toBe(200);
  expect(body.page).toBe(1);
  expect(body.data).toHaveLength(3);
});
