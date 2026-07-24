import { Hono } from "hono";
import type { Env } from "../bindings.js";
import { DJI_RESPONSE_CODES } from "@bombeiros/shared";
import { signJWT, verifyJWT, verifyPassword } from "../services/crypto.js";
import * as dbQueries from "../db/queries.js";

export const djiPilotRoutes = new Hono<{ Bindings: Env }>();

function djiResponse(code: number, data: unknown = {}, message = "") {
  return { code, message, data };
}

djiPilotRoutes.post("/api/v1/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.INVALID_PARAM, {}, "Missing credentials"),
        200
      );
    }

    const user = await dbQueries.getUserByEmail(c.env.DB, username);
    if (!user) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.INVALID_PARAM, {}, "Invalid credentials"),
        200
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.INVALID_PARAM, {}, "Invalid credentials"),
        200
      );
    }

    const accessToken = await signJWT(
      { sub: user.id, org_id: user.org_id, role: user.role },
      c.env.JWT_SECRET
    );

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 604800,
        user_id: user.id,
        username: user.email,
        workspace_id: user.org_id,
      }),
      200
    );
  } catch {
    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal server error"),
      200
    );
  }
});

djiPilotRoutes.post("/api/v1/token/refresh", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Missing token"),
        200
      );
    }

    const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
    if (!payload) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_EXPIRED, {}, "Token expired"),
        200
      );
    }

    const newToken = await signJWT(
      { sub: payload.sub, org_id: payload.org_id, role: payload.role },
      c.env.JWT_SECRET
    );

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, {
        access_token: newToken,
        token_type: "Bearer",
        expires_in: 604800,
      }),
      200
    );
  } catch {
    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal server error"),
      200
    );
  }
});

djiPilotRoutes.get("/api/v1/workspaces/current", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"),
        200
      );
    }

    const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
    if (!payload) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_EXPIRED, {}, "Token expired"),
        200
      );
    }

    const org = await dbQueries.getOrgById(c.env.DB, payload.org_id);

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, {
        workspace_id: payload.org_id,
        workspace_name: org?.name ?? "Unknown",
        workspace_desc: "DJI Pilot Workspace",
        platform_name: "Bombeiros DJI Middleware",
      }),
      200
    );
  } catch {
    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal server error"),
      200
    );
  }
});

djiPilotRoutes.get("/api/v1/workspaces/:wsId/devices/topologies", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"),
        200
      );
    }

    const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
    if (!payload) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.TOKEN_EXPIRED, {}, "Token expired"),
        200
      );
    }

    const wsId = c.req.param("wsId");
    const drones = await dbQueries.getDronesByOrg(c.env.DB, wsId);

    const hosts = drones.map((d) => ({
      sn: d.serial_number,
      device_name: d.name,
      model: d.model,
      online_status: d.status === "online",
      bound_status: true,
      children: [],
    }));

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, { list: hosts }),
      200
    );
  } catch {
    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal server error"),
      200
    );
  }
});
