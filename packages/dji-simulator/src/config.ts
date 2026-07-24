export const CONFIG = {
  BASE_URL: process.env.API_URL ?? "http://localhost:8787",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "shared-secret-with-emqx",
  DRONE_SN: process.env.DRONE_SN ?? "SIM00000001",
  USERNAME: process.env.USERNAME ?? "admin@bombeiros.pt",
  PASSWORD: process.env.PASSWORD ?? "changeme123",
  INTERVAL_MS: parseInt(process.env.INTERVAL_MS ?? "5000"),
};
