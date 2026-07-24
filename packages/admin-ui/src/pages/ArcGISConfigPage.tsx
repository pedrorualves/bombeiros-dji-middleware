import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";

interface ArcGISConfig {
  id: string;
  feature_service_url: string;
  points_layer_id: number;
  polygons_layer_id: number | null;
  polylines_layer_id: number | null;
  auth_type: string;
  username: string | null;
  password_encrypted: string | null;
  client_id: string | null;
  client_secret_encrypted: string | null;
  sync_interval_seconds: number;
}

export function ArcGISConfigPage() {
  const { user } = useAuth();
  const orgId = user?.org_id;

  const [featureServiceUrl, setFeatureServiceUrl] = useState("");
  const [pointsLayerId, setPointsLayerId] = useState(0);
  const [polygonsLayerId, setPolygonsLayerId] = useState("");
  const [polylinesLayerId, setPolylinesLayerId] = useState("");
  const [authType, setAuthType] = useState<"token" | "oauth">("token");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [syncInterval, setSyncInterval] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    apiFetch<{ config: ArcGISConfig | null }>(`/api/orgs/${orgId}/arcgis`)
      .then(({ data }) => {
        if (data.config) {
          setFeatureServiceUrl(data.config.feature_service_url);
          setPointsLayerId(data.config.points_layer_id);
          setPolygonsLayerId(
            data.config.polygons_layer_id?.toString() ?? ""
          );
          setPolylinesLayerId(
            data.config.polylines_layer_id?.toString() ?? ""
          );
          setAuthType(data.config.auth_type as "token" | "oauth");
          setUsername(data.config.username ?? "");
          setSyncInterval(data.config.sync_interval_seconds);
        }
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const { status, data } = await apiFetch<{ error?: string }>(
        `/api/orgs/${orgId}/arcgis`,
        {
          method: "PUT",
          body: JSON.stringify({
            feature_service_url: featureServiceUrl,
            points_layer_id: pointsLayerId,
            polygons_layer_id: polygonsLayerId ? parseInt(polygonsLayerId) : null,
            polylines_layer_id: polylinesLayerId
              ? parseInt(polylinesLayerId)
              : null,
            auth_type: authType,
            username: authType === "token" ? username : null,
            password: authType === "token" ? password : null,
            client_id: authType === "oauth" ? clientId : null,
            client_secret: authType === "oauth" ? clientSecret : null,
            sync_interval_seconds: syncInterval,
          }),
        }
      );
      if (status >= 400) {
        setError(data.error || "Failed to save");
        return;
      }
      setSaved(true);
      setPassword("");
      setClientSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await apiFetch<{ success: boolean; error?: string }>(
        `/api/orgs/${orgId}/arcgis/test`,
        { method: "POST" }
      );
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-400">Loading...</div>;
  }

  return (
    <div className="p-6 text-white max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">ArcGIS Configuration</h2>

      <form
        onSubmit={handleSave}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-3 py-2 rounded-lg text-sm">
            Configuration saved successfully.
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Feature Service URL
          </label>
          <input
            value={featureServiceUrl}
            onChange={(e) => setFeatureServiceUrl(e.target.value)}
            required
            type="url"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="https://services.arcgis.com/.../FeatureServer"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Points Layer ID
            </label>
            <input
              type="number"
              value={pointsLayerId}
              onChange={(e) => setPointsLayerId(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Polygons Layer ID
            </label>
            <input
              type="number"
              value={polygonsLayerId}
              onChange={(e) => setPolygonsLayerId(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Polylines Layer ID
            </label>
            <input
              type="number"
              value={polylinesLayerId}
              onChange={(e) => setPolylinesLayerId(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Sync Interval (seconds)
          </label>
          <input
            type="number"
            min={1}
            max={300}
            value={syncInterval}
            onChange={(e) => setSyncInterval(parseInt(e.target.value) || 10)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            How often to push telemetry to ArcGIS (debounce).
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Authentication Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authType"
                checked={authType === "token"}
                onChange={() => setAuthType("token")}
                className="accent-red-500"
              />
              <span className="text-sm">Username / Password</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authType"
                checked={authType === "oauth"}
                onChange={() => setAuthType("oauth")}
                className="accent-red-500"
              />
              <span className="text-sm">OAuth (App Credentials)</span>
            </label>
          </div>
        </div>

        {authType === "token" && (
          <>
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                ArcGIS Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                ArcGIS Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter to update (stored encrypted)"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </>
        )}

        {authType === "oauth" && (
          <>
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Client ID
              </label>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter to update (stored encrypted)"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {testing && <Loader2 className="w-4 h-4 animate-spin" />}
            Test Connection
          </button>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              testResult.success
                ? "bg-green-900/50 border border-green-700 text-green-300"
                : "bg-red-900/50 border border-red-700 text-red-300"
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {testResult.success
              ? "Connection successful!"
              : `Failed: ${testResult.error}`}
          </div>
        )}
      </form>
    </div>
  );
}
