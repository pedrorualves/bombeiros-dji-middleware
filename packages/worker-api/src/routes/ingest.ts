import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const ingestRoutes = new Hono<{ Bindings: Env }>();

ingestRoutes.post("/telemetry", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
ingestRoutes.post("/events", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
ingestRoutes.post("/status", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
