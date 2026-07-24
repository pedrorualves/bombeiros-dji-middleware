import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@dji-mw/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import { getDashboardStats, getMediaByOrg } from "../db/queries.js";
import { PaginationInput } from "@dji-mw/shared";

type DashEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const dashboardRoutes = new Hono<DashEnv>();

dashboardRoutes.use("*", authMiddleware(), requireOrgAccess());

dashboardRoutes.get("/stats", async (c) => {
  const orgId = c.req.param("orgId")!;
  const stats = await getDashboardStats(c.env.DB, orgId);
  return c.json({ stats });
});

dashboardRoutes.get("/media", async (c) => {
  const orgId = c.req.param("orgId")!;
  const pagination = PaginationInput.parse({
    page: c.req.query("page"),
    per_page: c.req.query("per_page"),
  });

  const result = await getMediaByOrg(
    c.env.DB,
    orgId,
    pagination.page,
    pagination.per_page
  );

  return c.json({
    media: result.media,
    total: result.total,
    page: pagination.page,
    per_page: pagination.per_page,
  });
});
