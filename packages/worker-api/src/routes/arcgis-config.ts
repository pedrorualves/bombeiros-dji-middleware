import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const arcgisConfigRoutes = new Hono<{ Bindings: Env }>();

arcgisConfigRoutes.get("/", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
arcgisConfigRoutes.put("/", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
arcgisConfigRoutes.post("/test", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
