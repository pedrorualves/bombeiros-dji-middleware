import { Hono } from "hono";
import type { Env } from "../bindings.js";
import type { UserRole } from "@dji-mw/shared";
import { ArcGISConfigInput } from "@dji-mw/shared";
import { authMiddleware, requireOrgAccess } from "../middleware/auth.js";
import { encrypt } from "../services/crypto.js";
import { getArcGISConfigByOrg, upsertArcGISConfig } from "../db/queries.js";
import { getArcGISToken, clearAuthCircuit } from "../services/arcgis-sync.js";

type ConfigEnv = {
  Bindings: Env;
  Variables: {
    user: { id: string; org_id: string; role: UserRole };
    renewedToken?: string;
  };
};

export const arcgisConfigRoutes = new Hono<ConfigEnv>();

arcgisConfigRoutes.use("*", authMiddleware(), requireOrgAccess());

arcgisConfigRoutes.get("/", async (c) => {
  const orgId = c.req.param("orgId")!;
  const config = await getArcGISConfigByOrg(c.env.DB, orgId);
  if (!config) {
    return c.json({ config: null });
  }
  return c.json({
    config: {
      ...config,
      password_encrypted: config.password_encrypted ? "***" : null,
      client_secret_encrypted: config.client_secret_encrypted ? "***" : null,
    },
  });
});

arcgisConfigRoutes.put("/", async (c) => {
  const parsed = ArcGISConfigInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.req.param("orgId")!;
  const data = parsed.data;

  let passwordEncrypted: string | null = null;
  let clientSecretEncrypted: string | null = null;

  if (data.auth_type === "token") {
    if (!data.username || !data.password) {
      return c.json({ error: "Username and password required for token auth" }, 400);
    }
    passwordEncrypted = await encrypt(data.password, c.env.ENCRYPTION_KEY);
  } else if (data.auth_type === "oauth") {
    if (!data.client_id || !data.client_secret) {
      return c.json({ error: "Client ID and secret required for OAuth" }, 400);
    }
    clientSecretEncrypted = await encrypt(data.client_secret, c.env.ENCRYPTION_KEY);
  }

  const id = crypto.randomUUID();
  const config = await upsertArcGISConfig(c.env.DB, id, orgId, {
    feature_service_url: data.feature_service_url,
    points_layer_id: data.points_layer_id,
    polygons_layer_id: data.polygons_layer_id,
    polylines_layer_id: data.polylines_layer_id,
    auth_type: data.auth_type,
    username: data.username,
    password_encrypted: passwordEncrypted,
    client_id: data.client_id,
    client_secret_encrypted: clientSecretEncrypted,
    sync_interval_seconds: data.sync_interval_seconds,
  });

  clearAuthCircuit(orgId);

  return c.json({
    config: {
      ...config,
      password_encrypted: config.password_encrypted ? "***" : null,
      client_secret_encrypted: config.client_secret_encrypted ? "***" : null,
    },
  });
});

arcgisConfigRoutes.post("/test", async (c) => {
  const orgId = c.req.param("orgId")!;
  const config = await getArcGISConfigByOrg(c.env.DB, orgId);
  if (!config) {
    return c.json({ error: "No ArcGIS configuration found" }, 404);
  }

  try {
    const token = await getArcGISToken(c.env, config, { bypassCircuit: true });
    const url = `${config.feature_service_url}?f=json&token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return c.json({
        success: false,
        error: `ArcGIS returned HTTP ${res.status}`,
      });
    }
    const info = await res.json() as Record<string, unknown>;
    if (info.error) {
      const errMsg =
        typeof info.error === "object"
          ? (info.error as Record<string, unknown>).message ?? JSON.stringify(info.error)
          : String(info.error);
      return c.json({ success: false, error: errMsg });
    }
    return c.json({
      success: true,
      layer_info: {
        service_description: info.serviceDescription,
        layers: info.layers,
      },
    });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    });
  }
});
