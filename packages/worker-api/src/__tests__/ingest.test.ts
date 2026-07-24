import { describe, it, expect, beforeAll } from "vitest";
import { fetchApp, env } from "./setup";

describe("Ingest Routes", () => {
  let token: string;
  let orgId: string;
  const droneSn = "TEST-DRONE-001";

  beforeAll(async () => {
    await env.DB.exec(
      await (await fetch(new URL("../db/schema.sql", import.meta.url))).text()
    );

    const regRes = await fetchApp("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "ingest@bombeiros.pt",
        password: "Test1234!",
      }),
    });
    const regBody = (await regRes.json()) as { token: string; user: { org_id: string } };
    token = regBody.token;
    orgId = regBody.user.org_id;

    await fetchApp(`/api/orgs/${orgId}/drones`, {
      method: "POST",
      token,
      body: JSON.stringify({
        serial_number: droneSn,
        name: "Test Drone",
        model: "matrice_4t",
      }),
    });
  });

  it("POST /api/ingest/telemetry without secret returns 401", async () => {
    const res = await fetchApp("/api/ingest/telemetry", {
      method: "POST",
      body: JSON.stringify({ sn: droneSn, data: {} }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/ingest/telemetry with valid data succeeds", async () => {
    const res = await fetchApp("/api/ingest/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        sn: droneSn,
        data: {
          latitude: 38.7223,
          longitude: -9.1393,
          height: 100,
          horizontal_speed: 5.0,
          attitude_head: 180,
          battery: { capacity_percent: 85 },
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("POST /api/ingest/status updates drone status", async () => {
    const res = await fetchApp("/api/ingest/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        sn: droneSn,
        online: false,
      }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/ingest/telemetry with unknown drone returns 404", async () => {
    const res = await fetchApp("/api/ingest/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({ sn: "UNKNOWN-DRONE-999", data: {} }),
    });
    expect(res.status).toBe(404);
  });
});
