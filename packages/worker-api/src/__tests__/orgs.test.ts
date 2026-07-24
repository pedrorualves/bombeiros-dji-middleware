import { describe, it, expect, beforeAll } from "vitest";
import { fetchApp, env } from "./setup";

describe("Org Routes", () => {
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    await env.DB.exec(
      await (await fetch(new URL("../db/schema.sql", import.meta.url))).text()
    );

    const res = await fetchApp("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "orgtest@bombeiros.pt",
        password: "Test1234!",
      }),
    });
    const body = (await res.json()) as { token: string };
    token = body.token;
  });

  it("POST /api/orgs creates an org", async () => {
    const res = await fetchApp("/api/orgs", {
      method: "POST",
      token,
      body: JSON.stringify({
        name: "Bombeiros Lisboa",
        slug: "bombeiros-lisboa",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { org: { id: string; name: string; slug: string } };
    expect(body.org.name).toBe("Bombeiros Lisboa");
    expect(body.org.slug).toBe("bombeiros-lisboa");
    orgId = body.org.id;
  });

  it("GET /api/orgs lists orgs", async () => {
    const res = await fetchApp("/api/orgs", { token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orgs: Array<{ id: string }> };
    expect(body.orgs.length).toBeGreaterThanOrEqual(1);
  });

  it("PUT /api/orgs/:id updates org name", async () => {
    const res = await fetchApp(`/api/orgs/${orgId}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ name: "Bombeiros Lisboa Updated" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { org: { name: string } };
    expect(body.org.name).toBe("Bombeiros Lisboa Updated");
  });

  it("POST /api/orgs with duplicate slug fails", async () => {
    const res = await fetchApp("/api/orgs", {
      method: "POST",
      token,
      body: JSON.stringify({
        name: "Another Org",
        slug: "bombeiros-lisboa",
      }),
    });
    expect(res.status).toBe(409);
  });
});
