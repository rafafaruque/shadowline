export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
}
export class PaginationInputError extends Error {
  constructor() {
    super(
      "page must be a positive safe integer; pageSize must be an integer from 1 to 100. Each parameter may appear only once.",
    );
  }
}

function integer(
  query: URLSearchParams,
  key: string,
  fallback: number,
  max: number,
): number {
  const values = query.getAll(key);
  if (!values.length) return fallback;
  const value = values[0];
  if (values.length !== 1 || !/^[1-9]\d*$/.test(value))
    throw new PaginationInputError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max)
    throw new PaginationInputError();
  return parsed;
}

/** No pagination keys means no opt-in. Unrelated query keys preserve legacy behavior. */
export function parsePagination(query: URLSearchParams): Pagination | null {
  if (!query.has("page") && !query.has("pageSize")) return null;
  const page = integer(query, "page", 1, Number.MAX_SAFE_INTEGER);
  const pageSize = integer(query, "pageSize", 10, 100);
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) throw new PaginationInputError();
  return { page, pageSize, offset };
}

export function paginate<T>(items: readonly T[], pagination: Pagination) {
  const { page, pageSize, offset } = pagination;
  return {
    data: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}
