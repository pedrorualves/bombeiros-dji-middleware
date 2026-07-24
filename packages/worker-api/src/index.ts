import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./bindings.js";
import { authRoutes } from "./routes/auth.js";
import { orgRoutes } from "./routes/orgs.js";
import { droneRoutes } from "./routes/drones.js";
import { arcgisConfigRoutes } from "./routes/arcgis-config.js";
import { syncLogRoutes } from "./routes/sync-logs.js";
import { ingestRoutes } from "./routes/ingest.js";
import { djiPilotRoutes } from "./routes/dji-pilot.js";
import { djiMediaRoutes } from "./routes/dji-media.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) =>
  c.json({ status: "ok", service: "bombeiros-dji-middleware" })
);

app.route("/api/auth", authRoutes);
app.route("/api/orgs", orgRoutes);
app.route("/api/orgs/:orgId/drones", droneRoutes);
app.route("/api/orgs/:orgId/arcgis", arcgisConfigRoutes);
app.route("/api/orgs/:orgId/sync-logs", syncLogRoutes);
app.route("/api/ingest", ingestRoutes);
app.route("/manage", djiPilotRoutes);
app.route("/media", djiMediaRoutes);

export default app;
