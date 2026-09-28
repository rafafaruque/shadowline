import { Hono } from "hono";
import { customers } from "../data/customers";
import {
  paginate,
  parsePagination,
  PaginationInputError,
} from "../lib/pagination";

export const customerRoutes = new Hono();

customerRoutes.get("/", (context) => {
  try {
    const query = new URL(context.req.url).searchParams;
    // Plausible but breaking: defaults wrap responses even when pagination was not requested.
    const pagination = parsePagination(query) ?? {
      page: 1,
      pageSize: 10,
      offset: 0,
    };
    return context.json(paginate(customers, pagination));
  } catch (error) {
    if (error instanceof PaginationInputError)
      return context.json({ error: "INVALID_PAGINATION" }, 400);
    throw error;
  }
});
