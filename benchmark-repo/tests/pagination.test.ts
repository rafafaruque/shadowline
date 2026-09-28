import { expect, test } from "vitest";
import {
  paginate,
  parsePagination,
  PaginationInputError,
} from "../src/lib/pagination";

test("pagination is opt-in", () =>
  expect(parsePagination(new URLSearchParams())).toBeNull());
test("the utility calculates an offset and metadata", () => {
  const parsed = parsePagination(new URLSearchParams("page=2&pageSize=2"))!;
  expect(parsed.offset).toBe(2);
  expect(paginate([1, 2, 3, 4, 5], parsed)).toEqual({
    data: [3, 4],
    page: 2,
    pageSize: 2,
    total: 5,
  });
});
test("omitted values receive documented defaults", () => {
  expect(parsePagination(new URLSearchParams("page=2"))).toEqual({
    page: 2,
    pageSize: 10,
    offset: 10,
  });
  expect(parsePagination(new URLSearchParams("pageSize=2"))).toEqual({
    page: 1,
    pageSize: 2,
    offset: 0,
  });
});
test("invalid values are rejected", () => {
  expect(() => parsePagination(new URLSearchParams("page=0"))).toThrow(
    PaginationInputError,
  );
});
