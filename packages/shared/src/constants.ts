export const MQTT_TOPICS = {
  OSD: "thing/product/+/osd",
  STATE: "thing/product/+/state",
  STATUS: "sys/product/+/status",
  EVENTS: "thing/product/+/events",
  REQUESTS: "thing/product/+/requests",
  SERVICES: "thing/product/+/services",
} as const;

export const DJI_MODELS = {
  MATRICE_4T: "matrice_4t",
  MATRICE_4E: "matrice_4e",
} as const;

export const DJI_CAMERAS = {
  WIDE: "wide",
  ZOOM: "zoom",
  IR: "ir",
} as const;

export const ARCGIS_SPATIAL_REF = {
  WGS84: 4326,
} as const;

export const DJI_RESPONSE_CODES = {
  SUCCESS: 0,
  INVALID_PARAM: 1,
  TOKEN_INVALID: 2,
  TOKEN_EXPIRED: 3,
  SERVER_ERROR: 500,
} as const;

export const DEFAULT_SYNC_INTERVAL_SECONDS = 10;

export const SESSION = {
  JWT_EXPIRY_SECONDS: 604800,          // 7 days
  JWT_RENEW_AFTER_SECONDS: 302400,     // 3.5 days — auto-renew past this age
  PBKDF2_ITERATIONS: 600000,           // OWASP 2023 recommendation for SHA-256
  PBKDF2_SALT_BYTES: 16,
  AES_IV_BYTES: 12,                    // AES-GCM standard
} as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
