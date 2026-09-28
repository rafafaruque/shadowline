import { Hono } from "hono";
import { customerRoutes } from "./routes/customers";

export const app = new Hono();
app.route("/customers", customerRoutes);
