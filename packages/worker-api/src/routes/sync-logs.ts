import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@dji-mw/shared";
import { PaginationInput } from "@dji-mw/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import { getSyncLogs } from "../db/queries.js";

type LogEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const syncLogRoutes = new Hono<LogEnv>();

syncLogRoutes.use("*", authMiddleware(), requireOrgAccess());

syncLogRoutes.get("/", async (c) => {
  const orgId = c.req.param("orgId")!;
  const pagination = PaginationInput.parse({
    page: c.req.query("page"),
    per_page: c.req.query("per_page"),
  });

  const filters = {
    sync_type: c.req.query("sync_type"),
    status: c.req.query("status"),
    drone_sn: c.req.query("drone_sn"),
  };

  const result = await getSyncLogs(
    c.env.DB,
    orgId,
    pagination.page,
    pagination.per_page,
    filters
  );

  return c.json({
    logs: result.logs,
    total: result.total,
    page: pagination.page,
    per_page: pagination.per_page,
  });
});
