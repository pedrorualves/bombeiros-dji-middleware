import type { Env } from "../bindings.js";
import type { ArcGISConfig } from "@bombeiros/shared";
import { decrypt } from "./crypto.js";
import * as dbQueries from "../db/queries.js";

interface ArcGISToken {
  token: string;
  expires: number;
}

const tokenCache = new Map<string, ArcGISToken>();

export async function getArcGISToken(
  env: Env,
  config: ArcGISConfig
): Promise<string> {
  const cached = tokenCache.get(config.org_id);
  const now = Date.now();
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
      referer: "https://bombeiros-dji-middleware.workers.dev",
      f: "json",
    });
    const res = await fetch("https://www.arcgis.com/sharing/rest/generateToken", {
      method: "POST",
      body: params,
    });
    const data = await res.json() as { token?: string; expires?: number; error?: { message: string } };
    if (data.error || !data.token) {
      throw new Error(`ArcGIS token error: ${data.error?.message ?? "Unknown"}`);
    }
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
    const res = await fetch("https://www.arcgis.com/sharing/rest/oauth2/token", {
      method: "POST",
      body: params,
    });
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: { message: string } };
    if (data.error || !data.access_token) {
      throw new Error(`ArcGIS OAuth error: ${data.error?.message ?? "Unknown"}`);
    }
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

  const res = await fetch(`${layerUrl}/addFeatures`, {
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

  const res = await fetch(`${layerUrl}/${objectId}/addAttachment`, {
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
