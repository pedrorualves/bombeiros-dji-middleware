export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  SESSION_STORE: KVNamespace;
  JWT_SECRET: string;
  WEBHOOK_SECRET: string;
  ENCRYPTION_KEY: string;
  DJI_APP_ID: string;
  DJI_APP_KEY: string;
  DJI_APP_LICENSE: string;
  R2_ACCESS_KEY_ID: string;
  R2_ACCESS_KEY_SECRET: string;
  R2_ACCOUNT_ID: string;
  EMQX_HOST: string;
  EMQX_PORT: string;
}
