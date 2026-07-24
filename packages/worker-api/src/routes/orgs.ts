import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const orgRoutes = new Hono<{ Bindings: Env }>();

orgRoutes.get("/", (c) => c.json({ error: "Not implemented" }, 501));
orgRoutes.get("/:orgId", (c) => c.json({ error: "Not implemented" }, 501));
orgRoutes.post("/", (c) => c.json({ error: "Not implemented" }, 501));
orgRoutes.put("/:orgId", (c) => c.json({ error: "Not implemented" }, 501));
orgRoutes.delete("/:orgId", (c) => c.json({ error: "Not implemented" }, 501));
