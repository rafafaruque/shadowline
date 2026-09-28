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
    const pagination = parsePagination(new URL(context.req.url).searchParams);
    // Preserve the historical contract unless the caller explicitly opts in.
    if (!pagination) return context.json(customers);
    return context.json(paginate(customers, pagination));
  } catch (error) {
    if (error instanceof PaginationInputError)
      return context.json({ error: "INVALID_PAGINATION" }, 400);
    throw error;
  }
});
