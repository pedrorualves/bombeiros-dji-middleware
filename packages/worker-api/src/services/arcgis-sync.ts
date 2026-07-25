import type { Env } from "../bindings.js";
import type { ArcGISConfig } from "@dji-mw/shared";
import { decrypt } from "./crypto.js";
import * as dbQueries from "../db/queries.js";

interface ArcGISToken {
  token: string;
  expires: number;
}

const tokenCache = new Map<string, ArcGISToken>();

const AUTH_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

interface AuthCircuitEntry {
  until: number;
  error: string;
}

const authCircuit = new Map<string, AuthCircuitEntry>();

export function clearAuthCircuit(orgId: string): void {
  authCircuit.delete(orgId);
  tokenCache.delete(orgId);
}

const GENERIC_HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://www.arcgis.com",
};

function arcgisFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(GENERIC_HEADERS)) {
    headers.set(k, v);
  }
  return fetch(url, { ...init, headers });
}

export async function getArcGISToken(
  env: Env,
  config: ArcGISConfig,
  options?: { bypassCircuit?: boolean }
): Promise<string> {
  const now = Date.now();

  // Check circuit breaker (unless bypassed by test connection)
  if (!options?.bypassCircuit) {
    const circuit = authCircuit.get(config.org_id);
    if (circuit && now < circuit.until) {
      const minutesLeft = Math.ceil((circuit.until - now) / 60000);
      throw new Error(
        `ArcGIS auth suspended (${minutesLeft}min remaining): ${circuit.error}. Update credentials in ArcGIS Config to retry immediately.`
      );
    }
  }

  const cached = tokenCache.get(config.org_id);
  if (cached && cached.expires > now + 60000) {
    return cached.token;
  }

  if (config.auth_type === "token") {
    if (!config.username || !config.password_encrypted) {
      throw new Error("ArcGIS username/password not configured");
    }
    const password = await decrypt(config.password_encrypted, env.ENCRYPTION_KEY);
    const params = new URLSearchParams({
      username: config.username,
      password,
      referer: "https://www.arcgis.com",
      f: "json",
    });
    const res = await arcgisFetch("https://www.arcgis.com/sharing/rest/generateToken", {
      method: "POST",
      body: params,
    });
    const data = await res.json() as { token?: string; expires?: number; error?: { code?: number; message?: string; details?: string[] } };
    if (data.error || !data.token) {
      const details = data.error?.details?.join("; ") ?? "";
      const errMsg = `ArcGIS token error: ${data.error?.message ?? "Unknown"}${details ? ` (${details})` : ""}`;
      authCircuit.set(config.org_id, { until: now + AUTH_COOLDOWN_MS, error: errMsg });
      throw new Error(errMsg);
    }
    authCircuit.delete(config.org_id);
    tokenCache.set(config.org_id, { token: data.token, expires: data.expires ?? now + 3600000 });
    return data.token;
  }

  if (config.auth_type === "oauth") {
    if (!config.client_id || !config.client_secret_encrypted) {
      throw new Error("ArcGIS OAuth credentials not configured");
    }
    const clientSecret = await decrypt(config.client_secret_encrypted, env.ENCRYPTION_KEY);
    const params = new URLSearchParams({
      client_id: config.client_id,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      f: "json",
    });
    const res = await arcgisFetch("https://www.arcgis.com/sharing/rest/oauth2/token", {
      method: "POST",
      body: params,
    });
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: { message: string } };
    if (data.error || !data.access_token) {
      const errMsg = `ArcGIS OAuth error: ${data.error?.message ?? "Unknown"}`;
      authCircuit.set(config.org_id, { until: now + AUTH_COOLDOWN_MS, error: errMsg });
      throw new Error(errMsg);
    }
    authCircuit.delete(config.org_id);
    const expiresIn = (data.expires_in ?? 3600) * 1000;
    tokenCache.set(config.org_id, { token: data.access_token, expires: now + expiresIn });
    return data.access_token;
  }

  throw new Error(`Unsupported auth type: ${config.auth_type}`);
}

export async function addFeaturePoint(
  env: Env,
  config: ArcGISConfig,
  attributes: Record<string, unknown>,
  longitude: number,
  latitude: number,
  altitude: number
): Promise<number | null> {
  const token = await getArcGISToken(env, config);
  const layerUrl = `${config.feature_service_url}/${config.points_layer_id}`;

  const feature = {
    geometry: {
      x: longitude,
      y: latitude,
      z: altitude,
      spatialReference: { wkid: 4326 },
    },
    attributes,
  };

  const params = new URLSearchParams({
    features: JSON.stringify([feature]),
    token,
    f: "json",
  });

  const res = await arcgisFetch(`${layerUrl}/addFeatures`, {
    method: "POST",
    body: params,
  });
  const data = await res.json() as {
    addResults?: Array<{ objectId: number; success: boolean; error?: { description: string } }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`ArcGIS addFeatures: ${data.error.message}`);
  }

  const result = data.addResults?.[0];
  if (!result?.success) {
    throw new Error(`ArcGIS addFeatures failed: ${result?.error?.description ?? "Unknown"}`);
  }

  return result.objectId;
}

export async function addAttachment(
  env: Env,
  config: ArcGISConfig,
  objectId: number,
  fileBlob: Blob,
  filename: string
): Promise<void> {
  const token = await getArcGISToken(env, config);
  const layerUrl = `${config.feature_service_url}/${config.points_layer_id}`;

  const formData = new FormData();
  formData.append("attachment", fileBlob, filename);
  formData.append("token", token);
  formData.append("f", "json");

  const res = await arcgisFetch(`${layerUrl}/${objectId}/addAttachment`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json() as {
    addAttachmentResult?: { success: boolean; error?: { description: string } };
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`ArcGIS addAttachment: ${data.error.message}`);
  }
  if (!data.addAttachmentResult?.success) {
    throw new Error(
      `ArcGIS addAttachment failed: ${data.addAttachmentResult?.error?.description ?? "Unknown"}`
    );
  }
}

export async function syncTelemetryToArcGIS(
  env: Env,
  orgId: string,
  droneSn: string,
  telemetry: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    heading: number;
    battery_level: number;
    timestamp: string;
  }
): Promise<void> {
  const config = await dbQueries.getArcGISConfigByOrg(env.DB, orgId);
  if (!config) return;

  try {
    const objectId = await addFeaturePoint(env, config, {
      drone_sn: droneSn,
      data_type: "telemetry",
      speed: telemetry.speed,
      heading: telemetry.heading,
      battery_level: telemetry.battery_level,
      altitude: telemetry.altitude,
      captured_at: telemetry.timestamp,
    }, telemetry.longitude, telemetry.latitude, telemetry.altitude);

    const syncId = crypto.randomUUID();
    await dbQueries.createSyncLog(
      env.DB, syncId, orgId, droneSn, "telemetry", "success", objectId, null
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const syncId = crypto.randomUUID();
    await dbQueries.createSyncLog(
      env.DB, syncId, orgId, droneSn, "telemetry", "failed", null, message
    );
  }
}

export async function syncMediaToArcGIS(
  env: Env,
  orgId: string,
  mediaId: string
): Promise<void> {
  const config = await dbQueries.getArcGISConfigByOrg(env.DB, orgId);
  if (!config) return;

  const media = await dbQueries.getMediaById(env.DB, mediaId);
  if (!media) return;

  const syncType = media.media_type === "video" ? "video" : "photo";

  try {
    const objectId = await addFeaturePoint(env, config, {
      drone_sn: media.drone_sn,
      data_type: media.media_type,
      filename: media.filename,
      camera: media.camera,
      altitude: media.altitude,
      captured_at: media.created_at,
    }, media.longitude, media.latitude, media.altitude);

    if (objectId !== null) {
      const r2Object = await env.MEDIA_BUCKET.get(media.r2_key);
      if (r2Object) {
        const blob = new Blob([await r2Object.arrayBuffer()]);
        await addAttachment(env, config, objectId, blob, media.filename);
      }

      await dbQueries.updateMediaSyncStatus(env.DB, mediaId, objectId);
    }

    const syncId = crypto.randomUUID();
    await dbQueries.createSyncLog(
      env.DB, syncId, orgId, media.drone_sn, syncType, "success", objectId, null
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const syncId = crypto.randomUUID();
    await dbQueries.createSyncLog(
      env.DB, syncId, orgId, media.drone_sn, syncType, "failed", null, message
    );
  }
}
