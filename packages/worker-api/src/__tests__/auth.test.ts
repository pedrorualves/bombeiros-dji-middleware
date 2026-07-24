import { describe, it, expect, beforeAll } from "vitest";
import { fetchApp, env } from "./setup";

describe("Auth Routes", () => {
  beforeAll(async () => {
    await env.DB.exec(
      await (await fetch(new URL("../db/schema.sql", import.meta.url))).text()
    );
  });

  it("GET / returns service status", async () => {
    const res = await fetchApp("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
  });

  it("POST /api/auth/login with no users triggers bootstrap hint", async () => {
    const res = await fetchApp("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "badpassword" }),
    });
    const body = (await res.json()) as { bootstrap?: boolean; error?: string };
    expect(body.bootstrap === true || body.error !== undefined).toBe(true);
  });

  describe("Bootstrap flow", () => {
    let token: string;

    it("POST /api/auth/register creates first super_admin", async () => {
      const res = await fetchApp("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@bombeiros.pt",
          password: "Test1234!",
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { user: { role: string }; token: string };
      expect(body.user.role).toBe("super_admin");
      expect(body.token).toBeDefined();
      token = body.token;
    });

    it("POST /api/auth/login with valid credentials returns token", async () => {
      const res = await fetchApp("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@bombeiros.pt",
          password: "Test1234!",
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { token: string };
      expect(body.token).toBeDefined();
      token = body.token;
    });

    it("GET /api/auth/me returns current user", async () => {
      const res = await fetchApp("/api/auth/me", { token });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { user: { email: string } };
      expect(body.user.email).toBe("admin@bombeiros.pt");
    });

    it("POST /api/auth/login with wrong password fails", async () => {
      const res = await fetchApp("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@bombeiros.pt",
          password: "wrongpassword",
        }),
      });
      expect(res.status).toBe(401);
    });
  });
});
