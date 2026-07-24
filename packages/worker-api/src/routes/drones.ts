import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const droneRoutes = new Hono<{ Bindings: Env }>();

droneRoutes.get("/", (c) => c.json({ error: "Not implemented" }, 501));
droneRoutes.post("/", (c) => c.json({ error: "Not implemented" }, 501));
droneRoutes.put("/:droneId", (c) => c.json({ error: "Not implemented" }, 501));
droneRoutes.delete("/:droneId", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
