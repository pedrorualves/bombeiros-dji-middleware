import { createMiddleware } from "hono/factory";
import type { Env } from "../bindings.js";
import type { UserRole, JWTPayload } from "@dji-mw/shared";
import { verifyJWT, shouldRenewJWT, signJWT } from "../services/crypto.js";

export interface AuthUser {
  id: string;
  org_id: string;
  role: UserRole;
}

type AuthEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    renewedToken?: string;
  };
};

export const authMiddleware = () =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = header.slice(7);
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("user", {
      id: payload.sub,
      org_id: payload.org_id,
      role: payload.role,
    });

    if (shouldRenewJWT(payload)) {
      const newToken = await signJWT(
        { sub: payload.sub, org_id: payload.org_id, role: payload.role },
        c.env.JWT_SECRET
      );
      c.set("renewedToken", newToken);
      c.header("X-Renewed-Token", newToken);
    }

    await next();
  });

export const requireRole = (...roles: UserRole[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });

export const requireOrgAccess = () =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (user.role === "super_admin") {
      await next();
      return;
    }
    const orgId = c.req.param("orgId");
    if (orgId && orgId !== user.org_id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });
