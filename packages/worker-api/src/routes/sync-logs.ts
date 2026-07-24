import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const syncLogRoutes = new Hono<{ Bindings: Env }>();

syncLogRoutes.get("/", (c) => c.json({ error: "Not implemented" }, 501));
