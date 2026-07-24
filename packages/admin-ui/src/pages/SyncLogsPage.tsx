import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";
import { StatusBadge } from "../components/StatusBadge";

interface SyncLog {
  id: string;
  drone_sn: string;
  sync_type: string;
  status: string;
  arcgis_object_id: number | null;
  error_message: string | null;
  created_at: string;
}

export function SyncLogsPage() {
  const { user } = useAuth();
  const orgId = user?.org_id;
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "50" });
      if (typeFilter) params.set("sync_type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const { data } = await apiFetch<{
        logs: SyncLog[];
        total: number;
      }>(`/api/orgs/${orgId}/sync-logs?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [orgId, page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sync Logs</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-red-500"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchLogs}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All types</option>
          <option value="telemetry">Telemetry</option>
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="map_element">Map Element</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <span className="flex items-center text-sm text-slate-400">
          {total} total
        </span>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Drone SN</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">
                    ArcGIS Object ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {log.drone_sn}
                    </td>
                    <td className="px-4 py-3 text-slate-300 capitalize">
                      {log.sync_type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.arcgis_object_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                      {log.error_message ?? "-"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No sync logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
