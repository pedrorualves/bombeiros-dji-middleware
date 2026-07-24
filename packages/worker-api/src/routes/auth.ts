import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post("/login", (c) => c.json({ error: "Not implemented" }, 501));
authRoutes.post("/register", (c) => c.json({ error: "Not implemented" }, 501));
authRoutes.post("/refresh", (c) => c.json({ error: "Not implemented" }, 501));
authRoutes.get("/me", (c) => c.json({ error: "Not implemented" }, 501));
