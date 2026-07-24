import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@bombeiros/shared";
import { CreateOrgInput, UpdateOrgInput } from "@bombeiros/shared";
import { authMiddleware, requireRole, requireOrgAccess } from "../middleware/auth.js";
import {
  listOrgs,
  getOrgById,
  getOrgBySlug,
  createOrg,
  updateOrg,
  deleteOrg,
} from "../db/queries.js";

type OrgEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const orgRoutes = new Hono<OrgEnv>();

orgRoutes.use("*", authMiddleware());

orgRoutes.get("/", requireRole("super_admin"), async (c) => {
  const orgs = await listOrgs(c.env.DB);
  return c.json({ orgs });
});

orgRoutes.get("/:orgId", requireOrgAccess(), async (c) => {
  const org = await getOrgById(c.env.DB, c.req.param("orgId"));
  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }
  return c.json({ org });
});

orgRoutes.post("/", requireRole("super_admin"), async (c) => {
  const parsed = CreateOrgInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const existing = await getOrgBySlug(c.env.DB, parsed.data.slug);
  if (existing) {
    return c.json({ error: "Slug already in use" }, 409);
  }

  const id = crypto.randomUUID();
  const org = await createOrg(c.env.DB, id, parsed.data.name, parsed.data.slug);
  return c.json({ org }, 201);
});

orgRoutes.put("/:orgId", requireRole("super_admin"), async (c) => {
  const parsed = UpdateOrgInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.req.param("orgId");
  const existing = await getOrgById(c.env.DB, orgId);
  if (!existing) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const org = await updateOrg(c.env.DB, orgId, parsed.data.name);
  return c.json({ org });
});

orgRoutes.delete("/:orgId", requireRole("super_admin"), async (c) => {
  const orgId = c.req.param("orgId");
  const existing = await getOrgById(c.env.DB, orgId);
  if (!existing) {
    return c.json({ error: "Organization not found" }, 404);
  }

  if (existing.slug === "system") {
    return c.json({ error: "Cannot delete the system organization" }, 400);
  }

  await deleteOrg(c.env.DB, orgId);
  return c.json({ deleted: true });
});
