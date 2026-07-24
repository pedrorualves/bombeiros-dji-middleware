import { Hono } from "hono";
import type { Env } from "../bindings.js";
import { DJI_RESPONSE_CODES } from "@bombeiros/shared";
import { verifyJWT } from "../services/crypto.js";
import * as dbQueries from "../db/queries.js";
import { syncMediaToArcGIS } from "../services/arcgis-sync.js";

export const djiMediaRoutes = new Hono<{ Bindings: Env }>();

function djiResponse(code: number, data: unknown = {}, message = "") {
  return { code, message, data };
}

async function extractPayload(c: { req: { header: (n: string) => string | undefined }; env: Env }) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
}

djiMediaRoutes.post("/api/v1/workspaces/:wsId/upload-tiny-fingerprint", async (c) => {
  try {
    const payload = await extractPayload(c);
    if (!payload) {
      return c.json(djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"), 200);
    }

    const body = await c.req.json();
    const fingerprints: string[] = body.tiny_fingerprints ?? [];

    const existingFingerprints: string[] = [];
    for (const fp of fingerprints) {
      const existing = await dbQueries.getMediaByFingerprint(c.env.DB, fp);
      if (existing) existingFingerprints.push(fp);
    }

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, {
        tiny_fingerprints: existingFingerprints,
      }),
      200
    );
  } catch {
    return c.json(djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal error"), 200);
  }
});

djiMediaRoutes.post("/api/v1/workspaces/:wsId/obtain-sts", async (c) => {
  try {
    const payload = await extractPayload(c);
    if (!payload) {
      return c.json(djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"), 200);
    }

    const wsId = c.req.param("wsId");
    const bucket = "bombeiros-media";
    const region = "auto";
    const objectKeyPrefix = `orgs/${wsId}/media/`;

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, {
        credentials: {
          access_key_id: c.env.R2_ACCESS_KEY_ID,
          access_key_secret: c.env.R2_ACCESS_KEY_SECRET,
          expire: 3600,
          security_token: "",
        },
        provider: "aws",
        bucket,
        region,
        endpoint: `https://${bucket}.${c.env.R2_ACCOUNT_ID ?? "ACCOUNT_ID"}.r2.cloudflarestorage.com`,
        object_key_prefix: objectKeyPrefix,
      }),
      200
    );
  } catch {
    return c.json(djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal error"), 200);
  }
});

djiMediaRoutes.post("/api/v1/workspaces/:wsId/fast-upload", async (c) => {
  try {
    const payload = await extractPayload(c);
    if (!payload) {
      return c.json(djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"), 200);
    }

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, { is_uploaded: false }),
      200
    );
  } catch {
    return c.json(djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal error"), 200);
  }
});

djiMediaRoutes.post("/api/v1/workspaces/:wsId/upload-callback", async (c) => {
  try {
    const payload = await extractPayload(c);
    if (!payload) {
      return c.json(djiResponse(DJI_RESPONSE_CODES.TOKEN_INVALID, {}, "Unauthorized"), 200);
    }

    const wsId = c.req.param("wsId");
    const body = await c.req.json();

    const {
      file: fileInfo,
      metadata,
    } = body;

    if (!fileInfo || !fileInfo.object_key) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.INVALID_PARAM, {}, "Missing file info"),
        200
      );
    }

    const droneSn = metadata?.drone_sn ?? fileInfo.drone_sn ?? "unknown";
    const mediaType = detectMediaType(fileInfo.name ?? fileInfo.object_key);
    const fingerprint = fileInfo.fingerprint ?? fileInfo.object_key;

    const existing = await dbQueries.getMediaByFingerprint(c.env.DB, fingerprint);
    if (existing) {
      return c.json(
        djiResponse(DJI_RESPONSE_CODES.SUCCESS, { media_id: existing.id }),
        200
      );
    }

    const mediaId = crypto.randomUUID();
    await dbQueries.createMediaRecord(c.env.DB, {
      id: mediaId,
      org_id: wsId,
      drone_sn: droneSn,
      r2_key: fileInfo.object_key,
      filename: fileInfo.name ?? fileInfo.object_key.split("/").pop() ?? "unknown",
      media_type: mediaType,
      camera: metadata?.payload_model_key ?? "wide",
      latitude: metadata?.latitude ?? 0,
      longitude: metadata?.longitude ?? 0,
      altitude: metadata?.altitude ?? 0,
      file_size_bytes: fileInfo.size ?? 0,
      fingerprint,
    });

    c.executionCtx.waitUntil(
      syncMediaToArcGIS(c.env, wsId, mediaId).catch((err: unknown) => {
        console.error("ArcGIS media sync failed:", err);
      })
    );

    return c.json(
      djiResponse(DJI_RESPONSE_CODES.SUCCESS, { media_id: mediaId }),
      200
    );
  } catch (err) {
    console.error("Upload callback error:", err);
    return c.json(djiResponse(DJI_RESPONSE_CODES.SERVER_ERROR, {}, "Internal error"), 200);
  }
});

function detectMediaType(filename: string): "photo" | "video" | "thermal" | "panorama" {
  const lower = filename.toLowerCase();
  if (lower.includes("_t_") || lower.includes("thermal") || lower.includes("_ir")) return "thermal";
  if (lower.includes("pano")) return "panorama";
  if (/\.(mp4|mov|avi|mkv)$/i.test(lower)) return "video";
  return "photo";
}
