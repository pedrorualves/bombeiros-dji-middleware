import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@bombeiros/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import { sendDJICommand } from "../services/mqtt-bridge.js";
import * as dbQueries from "../db/queries.js";

type CmdEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const commandRoutes = new Hono<CmdEnv>();

commandRoutes.use("*", authMiddleware(), requireOrgAccess());

commandRoutes.post("/:droneSn/send", async (c) => {
  const orgId = c.req.param("orgId")!;
  const droneSn = c.req.param("droneSn");

  const drone = await dbQueries.getDroneBySerialNumber(c.env.DB, droneSn);
  if (!drone || drone.org_id !== orgId) {
    return c.json({ error: "Drone not found" }, 404);
  }

  const body = await c.req.json();
  const { method, data } = body;

  if (!method || typeof method !== "string") {
    return c.json({ error: "Missing 'method' field" }, 400);
  }

  try {
    await sendDJICommand(c.env, droneSn, method, data ?? {});
    return c.json({ status: "sent", method, drone_sn: droneSn });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Command send failed:", message);
    return c.json({ error: message }, 502);
  }
});

commandRoutes.post("/:droneSn/camera-mode", async (c) => {
  const orgId = c.req.param("orgId")!;
  const droneSn = c.req.param("droneSn");

  const drone = await dbQueries.getDroneBySerialNumber(c.env.DB, droneSn);
  if (!drone || drone.org_id !== orgId) {
    return c.json({ error: "Drone not found" }, 404);
  }

  const body = await c.req.json();
  const { camera_mode } = body;

  if (!["photo", "video", "ir"].includes(camera_mode)) {
    return c.json({ error: "Invalid camera_mode. Use: photo, video, ir" }, 400);
  }

  try {
    await sendDJICommand(c.env, droneSn, "camera_mode_switch", {
      camera_mode,
      payload_index: "wide",
    });
    return c.json({ status: "sent", camera_mode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 502);
  }
});

commandRoutes.post("/:droneSn/take-photo", async (c) => {
  const orgId = c.req.param("orgId")!;
  const droneSn = c.req.param("droneSn");

  const drone = await dbQueries.getDroneBySerialNumber(c.env.DB, droneSn);
  if (!drone || drone.org_id !== orgId) {
    return c.json({ error: "Drone not found" }, 404);
  }

  try {
    await sendDJICommand(c.env, droneSn, "camera_photo_take", {
      payload_index: "wide",
    });
    return c.json({ status: "sent", action: "take_photo" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 502);
  }
});
