import { useState, useEffect, useCallback } from "react";
import { Radio, Image, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";
import { StatusBadge } from "../components/StatusBadge";

interface Stats {
  drone_count: number;
  media_count: number;
  syncs_today: number;
  failed_today: number;
}

interface SyncLog {
  id: string;
  drone_sn: string;
  sync_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const orgId = user?.org_id;
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    try {
      const [statsRes, logsRes] = await Promise.all([
        apiFetch<{ stats: Stats }>(`/api/orgs/${orgId}/stats`),
        apiFetch<{ logs: SyncLog[] }>(`/api/orgs/${orgId}/sync-logs?per_page=10`),
      ]);
      setStats(statsRes.data.stats);
      setRecentLogs(logsRes.data.logs);
    } catch {
      // handled
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Radio className="w-5 h-5" />}
          label="Drones Registered"
          value={stats?.drone_count.toString() ?? "--"}
          color="bg-blue-600"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Syncs Today"
          value={stats?.syncs_today.toString() ?? "--"}
          color="bg-green-600"
        />
        <StatCard
          icon={<Image className="w-5 h-5" />}
          label="Media Files"
          value={stats?.media_count.toString() ?? "--"}
          color="bg-purple-600"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Failed Syncs"
          value={stats?.failed_today.toString() ?? "--"}
          color="bg-red-600"
        />
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        {recentLogs.length === 0 ? (
          <p className="text-slate-400">
            Connect your first drone to see activity here.
          </p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="text-sm capitalize">{log.sync_type}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {log.drone_sn}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${color} p-2 rounded-lg`}>{icon}</div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
