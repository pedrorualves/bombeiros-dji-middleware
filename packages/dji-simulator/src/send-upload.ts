import { CONFIG } from "./config.js";

async function login(): Promise<string> {
  const res = await fetch(`${CONFIG.BASE_URL}/manage/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: CONFIG.USERNAME,
      password: CONFIG.PASSWORD,
    }),
  });
  const data = await res.json() as { code: number; data: { access_token: string } };
  if (data.code !== 0) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }
  return data.data.access_token;
}

async function simulateUploadCallback(token: string, workspaceId: string) {
  const filename = `DJI_${Date.now()}_WIDE.jpg`;
  const fingerprint = `sim_${crypto.randomUUID()}`;
  const lat = 38.7223 + (Math.random() - 0.5) * 0.01;
  const lng = -9.1393 + (Math.random() - 0.5) * 0.01;
  const alt = 80 + Math.random() * 50;

  const res = await fetch(
    `${CONFIG.BASE_URL}/media/api/v1/workspaces/${workspaceId}/upload-callback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file: {
          object_key: `orgs/${workspaceId}/media/${filename}`,
          name: filename,
          size: 2048000 + Math.floor(Math.random() * 5000000),
          fingerprint,
        },
        metadata: {
          drone_sn: CONFIG.DRONE_SN,
          payload_model_key: "wide",
          latitude: lat,
          longitude: lng,
          altitude: alt,
        },
      }),
    }
  );

  const data = await res.json();
  console.log(
    `[${new Date().toISOString()}] Upload callback — ${filename} ` +
    `lat=${lat.toFixed(5)} lng=${lng.toFixed(5)} → ${res.status}`,
    data
  );
}

async function main() {
  console.log(`📷 DJI Simulator — Media upload mode`);
  console.log(`   Drone SN: ${CONFIG.DRONE_SN}`);
  console.log(`   Target:   ${CONFIG.BASE_URL}\n`);

  const token = await login();
  console.log("   Logged in successfully\n");

  const meRes = await fetch(`${CONFIG.BASE_URL}/manage/api/v1/workspaces/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json() as { data: { workspace_id: string } };
  const workspaceId = meData.data.workspace_id;
  console.log(`   Workspace: ${workspaceId}\n`);

  const count = parseInt(process.argv[2] ?? "3");
  for (let i = 0; i < count; i++) {
    await simulateUploadCallback(token, workspaceId);
    if (i < count - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✅ Sent ${count} simulated media uploads`);
}

main().catch(console.error);
