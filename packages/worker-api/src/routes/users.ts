import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@bombeiros/shared";
import { CreateUserInput, UpdateUserRoleInput } from "@bombeiros/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import { hashPassword } from "../services/crypto.js";
import * as dbQueries from "../db/queries.js";

type UsersEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const userRoutes = new Hono<UsersEnv>();

userRoutes.use("*", authMiddleware(), requireOrgAccess());

function stripPassword(user: { id: string; org_id: string; email: string; password_hash: string; role: UserRole; created_at: string }) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

userRoutes.get("/", async (c) => {
  const orgId = c.req.param("orgId")!;
  const currentUser = c.get("user");

  if (currentUser.role === "operator") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const users = await dbQueries.listUsersByOrg(c.env.DB, orgId);
  return c.json({ users: users.map(stripPassword) });
});

userRoutes.post("/", async (c) => {
  const orgId = c.req.param("orgId")!;
  const currentUser = c.get("user");

  if (currentUser.role !== "super_admin" && currentUser.role !== "org_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const parsed = CreateUserInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  const existing = await dbQueries.getUserByEmail(c.env.DB, parsed.data.email);
  if (existing) {
    return c.json({ error: "Email already in use" }, 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const id = crypto.randomUUID();
  const user = await dbQueries.createUser(
    c.env.DB,
    id,
    orgId,
    parsed.data.email,
    passwordHash,
    parsed.data.role
  );

  return c.json({ user: stripPassword(user) }, 201);
});

userRoutes.put("/:userId/role", async (c) => {
  const currentUser = c.get("user");
  const userId = c.req.param("userId");

  if (currentUser.role !== "super_admin" && currentUser.role !== "org_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (userId === currentUser.id) {
    return c.json({ error: "Cannot change your own role" }, 400);
  }

  const body = await c.req.json();
  const parsed = UpdateUserRoleInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  const targetUser = await dbQueries.getUserById(c.env.DB, userId);
  if (!targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (targetUser.role === "super_admin") {
    return c.json({ error: "Cannot modify super_admin role" }, 403);
  }

  await dbQueries.updateUserRole(c.env.DB, userId, parsed.data.role);
  const updated = await dbQueries.getUserById(c.env.DB, userId);
  return c.json({ user: stripPassword(updated!) });
});

userRoutes.delete("/:userId", async (c) => {
  const currentUser = c.get("user");
  const userId = c.req.param("userId");

  if (currentUser.role !== "super_admin" && currentUser.role !== "org_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (userId === currentUser.id) {
    return c.json({ error: "Cannot delete yourself" }, 400);
  }

  const targetUser = await dbQueries.getUserById(c.env.DB, userId);
  if (!targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (targetUser.role === "super_admin") {
    return c.json({ error: "Cannot delete super_admin" }, 403);
  }

  await dbQueries.deleteUser(c.env.DB, userId);
  return c.json({ deleted: true });
});
