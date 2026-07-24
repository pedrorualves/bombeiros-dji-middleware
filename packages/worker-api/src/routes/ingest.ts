import { Hono } from "hono";
import type { Env } from "../bindings.js";
import * as dbQueries from "../db/queries.js";
import { syncTelemetryToArcGIS } from "../services/arcgis-sync.js";

export const ingestRoutes = new Hono<{ Bindings: Env }>();

function verifyWebhook(c: { req: { header: (n: string) => string | undefined }; env: Env }): boolean {
  const secret = c.req.header("X-Webhook-Secret");
  return secret === c.env.WEBHOOK_SECRET;
}

ingestRoutes.post("/telemetry", async (c) => {
  if (!verifyWebhook(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();

    const droneSn: string = body.sn ?? body.gateway_sn ?? "";
    if (!droneSn) {
      return c.json({ error: "Missing drone serial number" }, 400);
    }

    const drone = await dbQueries.getDroneBySerialNumber(c.env.DB, droneSn);
    if (!drone) {
      return c.json({ error: "Unknown drone" }, 404);
    }

    await dbQueries.updateDroneStatus(
      c.env.DB,
      droneSn,
      "online",
      new Date().toISOString()
    );

    const osd = body.data ?? body;
    const telemetry = {
      latitude: osd.latitude ?? 0,
      longitude: osd.longitude ?? 0,
      altitude: osd.height ?? osd.altitude ?? 0,
      speed: osd.horizontal_speed ?? osd.speed ?? 0,
      heading: osd.attitude_head ?? osd.heading ?? 0,
      battery_level: osd.battery?.capacity_percent ?? osd.battery_level ?? 0,
      timestamp: new Date().toISOString(),
    };

    c.executionCtx.waitUntil(
      syncTelemetryToArcGIS(c.env, drone.org_id, droneSn, telemetry).catch(
        (err: unknown) => console.error("Telemetry sync failed:", err)
      )
    );

    return c.json({ status: "ok" });
  } catch (err) {
    console.error("Telemetry ingest error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

ingestRoutes.post("/events", async (c) => {
  if (!verifyWebhook(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const droneSn: string = body.sn ?? body.gateway_sn ?? "";

    if (droneSn) {
      const drone = await dbQueries.getDroneBySerialNumber(c.env.DB, droneSn);
      if (drone) {
        const syncId = crypto.randomUUID();
        await dbQueries.createSyncLog(
          c.env.DB,
          syncId,
          drone.org_id,
          droneSn,
          "telemetry",
          "success",
          null,
          `Event: ${body.method ?? body.event ?? "unknown"}`
        );
      }
    }

    return c.json({ status: "ok" });
  } catch (err) {
    console.error("Events ingest error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

ingestRoutes.post("/status", async (c) => {
  if (!verifyWebhook(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const droneSn: string = body.sn ?? body.gateway_sn ?? "";
    const online: boolean = body.online ?? body.status === "online";

    if (droneSn) {
      await dbQueries.updateDroneStatus(
        c.env.DB,
        droneSn,
        online ? "online" : "offline",
        new Date().toISOString()
      );
    }

    return c.json({ status: "ok" });
  } catch (err) {
    console.error("Status ingest error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
