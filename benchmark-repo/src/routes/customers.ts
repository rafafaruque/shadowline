import { Hono } from "hono";
import { customers } from "../data/customers";

export const customerRoutes = new Hono();

// Historical behavior: every existing caller receives the raw Customer[] array.
customerRoutes.get("/", (context) => context.json(customers));
