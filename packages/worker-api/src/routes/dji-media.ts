import { Hono } from "hono";
import type { Env } from "../bindings.js";

export const djiMediaRoutes = new Hono<{ Bindings: Env }>();

djiMediaRoutes.post("/api/v1/workspaces/:wsId/fast-upload", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
djiMediaRoutes.post(
  "/api/v1/workspaces/:wsId/upload-tiny-fingerprint",
  (c) => c.json({ error: "Not implemented" }, 501)
);
djiMediaRoutes.post("/api/v1/workspaces/:wsId/obtain-sts", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
djiMediaRoutes.post("/api/v1/workspaces/:wsId/upload-callback", (c) =>
  c.json({ error: "Not implemented" }, 501)
);
