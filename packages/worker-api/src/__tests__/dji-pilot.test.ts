import { describe, it, expect, beforeAll } from "vitest";
import { fetchApp, env } from "./setup";

describe("DJI Pilot Routes", () => {
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    await env.DB.exec(
      await (await fetch(new URL("../db/schema.sql", import.meta.url))).text()
    );

    const regRes = await fetchApp("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "pilot@test.local",
        password: "Test1234!",
      }),
    });
    const regBody = (await regRes.json()) as { token: string; user: { org_id: string } };
    token = regBody.token;
    orgId = regBody.user.org_id;
  });

  it("POST /manage/api/v1/login with valid creds returns access_token", async () => {
    const res = await fetchApp("/manage/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        username: "pilot@test.local",
        password: "Test1234!",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: number; data: { access_token: string } };
    expect(body.code).toBe(0);
    expect(body.data.access_token).toBeDefined();
  });

  it("POST /manage/api/v1/login with wrong password returns error code", async () => {
    const res = await fetchApp("/manage/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        username: "pilot@test.local",
        password: "wrongpass",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: number };
    expect(body.code).not.toBe(0);
  });

  it("GET /manage/api/v1/workspaces/current returns workspace info", async () => {
    const loginRes = await fetchApp("/manage/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        username: "pilot@test.local",
        password: "Test1234!",
      }),
    });
    const loginBody = (await loginRes.json()) as { data: { access_token: string } };

    const res = await fetchApp("/manage/api/v1/workspaces/current", {
      token: loginBody.data.access_token,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: number; data: { workspace_id: string } };
    expect(body.code).toBe(0);
    expect(body.data.workspace_id).toBeDefined();
  });

  it("POST /manage/api/v1/token/refresh returns new token", async () => {
    const loginRes = await fetchApp("/manage/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        username: "pilot@test.local",
        password: "Test1234!",
      }),
    });
    const loginBody = (await loginRes.json()) as { data: { access_token: string } };

    const res = await fetchApp("/manage/api/v1/token/refresh", {
      method: "POST",
      token: loginBody.data.access_token,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: number; data: { access_token: string } };
    expect(body.code).toBe(0);
    expect(body.data.access_token).toBeDefined();
  });
});
