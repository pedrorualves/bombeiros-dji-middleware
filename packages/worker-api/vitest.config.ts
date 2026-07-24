import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            JWT_SECRET: "test-jwt-secret-for-vitest-only",
            WEBHOOK_SECRET: "test-webhook-secret",
            ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            DJI_APP_ID: "test-dji-app-id",
            DJI_APP_KEY: "test-dji-app-key",
            DJI_APP_LICENSE: "test-license",
            R2_ACCESS_KEY_ID: "test-r2-key",
            R2_ACCESS_KEY_SECRET: "test-r2-secret",
            R2_ACCOUNT_ID: "test-account-id",
            EMQX_HOST: "localhost",
            EMQX_PORT: "1883",
            EMQX_API_KEY: "test-api-key",
            EMQX_API_SECRET: "test-api-secret",
          },
        },
      },
    },
  },
});
