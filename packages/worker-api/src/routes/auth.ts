import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@bombeiros/shared";
import { LoginInput, RegisterInput } from "@bombeiros/shared";
import {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
} from "../services/crypto.js";
import {
  getUserByEmail,
  getUserById,
  createUser,
  countUsers,
  getOrgById,
  createOrg,
} from "../db/queries.js";
import { authMiddleware } from "../middleware/auth.js";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const authRoutes = new Hono<AuthEnv>();

function sanitizeUser(user: {
  id: string;
  org_id: string;
  email: string;
  role: string;
  created_at: string;
  password_hash?: string;
}) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

authRoutes.post("/login", async (c) => {
  const parsed = LoginInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signJWT(
    { sub: user.id, org_id: user.org_id, role: user.role },
    c.env.JWT_SECRET
  );

  return c.json({ token, user: sanitizeUser(user) });
});

authRoutes.post("/register", async (c) => {
  const totalUsers = await countUsers(c.env.DB);
  const isBootstrap = totalUsers === 0;

  if (!isBootstrap) {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const payload = await verifyJWT(header.slice(7), c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
    if (payload.role !== "super_admin") {
      return c.json({ error: "Only super_admin can register users" }, 403);
    }
  }

  const body = await c.req.json();

  if (isBootstrap) {
    const email = body.email;
    const password = body.password;
    if (!email || !password || password.length < 8) {
      return c.json({ error: "Email and password (min 8 chars) required" }, 400);
    }

    const existing = await getUserByEmail(c.env.DB, email);
    if (existing) {
      return c.json({ error: "Email already registered" }, 409);
    }

    const orgId = crypto.randomUUID();
    await createOrg(c.env.DB, orgId, "System", "system");

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const user = await createUser(
      c.env.DB,
      userId,
      orgId,
      email,
      passwordHash,
      "super_admin"
    );

    const token = await signJWT(
      { sub: user.id, org_id: user.org_id, role: user.role },
      c.env.JWT_SECRET
    );

    return c.json(
      { token, user: sanitizeUser(user), bootstrap: true },
      201
    );
  }

  const parsed = RegisterInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { email, password, org_id, role } = parsed.data;

  const org = await getOrgById(c.env.DB, org_id);
  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const user = await createUser(
    c.env.DB,
    userId,
    org_id,
    email,
    passwordHash,
    role
  );

  return c.json({ user: sanitizeUser(user) }, 201);
});

authRoutes.post("/refresh", authMiddleware(), async (c) => {
  const user = c.get("user");
  const token = await signJWT(
    { sub: user.id, org_id: user.org_id, role: user.role },
    c.env.JWT_SECRET
  );
  return c.json({ token });
});

authRoutes.get("/me", authMiddleware(), async (c) => {
  const authUser = c.get("user");
  const user = await getUserById(c.env.DB, authUser.id);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({
    user: sanitizeUser(user),
    renewedToken: c.get("renewedToken") ?? null,
  });
});
