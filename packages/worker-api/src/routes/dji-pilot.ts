import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const djiPilotRoutes = new Hono<{ Bindings: Env }>();

djiPilotRoutes.post("/api/v1/login", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
djiPilotRoutes.post("/api/v1/token/refresh", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
djiPilotRoutes.get("/api/v1/workspaces/current", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
djiPilotRoutes.get(
  "/api/v1/workspaces/:wsId/devices/topologies",
  (c) => c.json({ error: "Not implemented" }, 501)
);
