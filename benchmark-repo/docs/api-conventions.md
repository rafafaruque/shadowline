# Customer API conventions

Existing API contracts must remain backward-compatible unless a task explicitly authorizes a breaking change. New optional behavior must preserve existing callers.

`GET /customers` historically returns the complete, ordered raw `Customer[]` array. Do not silently wrap it in an object. Unrelated query parameters do not opt into pagination.

Pagination is opt-in when either `page` or `pageSize` is present. Use `src/lib/pagination.ts`. Defaults are page 1 and pageSize 10. Return `{ data, page, pageSize, total }`; total describes the full dataset. Pages beyond the data return an empty data array.

Both parameters must be canonical positive decimal integers (no signs, leading zeros, whitespace, fractions, or scientific notation). pageSize is at most 100. Reject repeated, empty, malformed, unsafe integer, or unsafe offset values with HTTP 400 and exactly `{ "error": "INVALID_PAGINATION" }`. Omitted parameters use defaults; explicitly empty parameters are invalid.
