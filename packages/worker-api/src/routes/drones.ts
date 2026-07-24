import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@bombeiros/shared";
import { DroneRegistrationInput } from "@bombeiros/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import {
  getDronesByOrg,
  getDroneBySerialNumber,
  getDroneById,
  createDrone,
  updateDrone,
  deleteDrone,
} from "../db/queries.js";

type DroneEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const droneRoutes = new Hono<DroneEnv>();

droneRoutes.use("*", authMiddleware(), requireOrgAccess());

droneRoutes.get("/", async (c) => {
  const orgId = c.req.param("orgId")!;
  const drones = await getDronesByOrg(c.env.DB, orgId);
  return c.json({ drones });
});

droneRoutes.post("/", async (c) => {
  const parsed = DroneRegistrationInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const existing = await getDroneBySerialNumber(c.env.DB, parsed.data.serial_number);
  if (existing) {
    return c.json({ error: "Serial number already registered" }, 409);
  }

  const orgId = c.req.param("orgId")!;
  const id = crypto.randomUUID();
  const drone = await createDrone(
    c.env.DB,
    id,
    orgId,
    parsed.data.serial_number,
    parsed.data.name,
    parsed.data.model
  );
  return c.json({ drone }, 201);
});

droneRoutes.put("/:droneId", async (c) => {
  const droneId = c.req.param("droneId");
  const drone = await getDroneById(c.env.DB, droneId);
  if (!drone) {
    return c.json({ error: "Drone not found" }, 404);
  }

  const orgId = c.req.param("orgId")!;
  if (drone.org_id !== orgId) {
    return c.json({ error: "Drone does not belong to this organization" }, 403);
  }

  const body = await c.req.json();
  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "Name is required" }, 400);
  }

  const updated = await updateDrone(c.env.DB, droneId, body.name);
  return c.json({ drone: updated });
});

droneRoutes.delete("/:droneId", async (c) => {
  const droneId = c.req.param("droneId");
  const drone = await getDroneById(c.env.DB, droneId);
  if (!drone) {
    return c.json({ error: "Drone not found" }, 404);
  }

  const orgId = c.req.param("orgId")!;
  if (drone.org_id !== orgId) {
    return c.json({ error: "Drone does not belong to this organization" }, 403);
  }

  await deleteDrone(c.env.DB, droneId);
  return c.json({ deleted: true });
});
