import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";
import { StatusBadge } from "../components/StatusBadge";

interface Drone {
  id: string;
  org_id: string;
  serial_number: string;
  name: string;
  model: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export function DronesPage() {
  const { user } = useAuth();
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const orgId = user?.org_id;

  const fetchDrones = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data } = await apiFetch<{ drones: Drone[] }>(
        `/api/orgs/${orgId}/drones`
      );
      setDrones(data.drones);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { status, data } = await apiFetch<{ error?: string }>(
        `/api/orgs/${orgId}/drones`,
        {
          method: "POST",
          body: JSON.stringify({
            serial_number: serialNumber,
            name,
            model: "matrice_4t",
          }),
        }
      );
      if (status >= 400) {
        setError(data.error || "Failed");
        return;
      }
      setShowForm(false);
      setSerialNumber("");
      setName("");
      fetchDrones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDelete(drone: Drone) {
    if (!confirm(`Remove drone "${drone.name}"?`)) return;
    await apiFetch(`/api/orgs/${orgId}/drones/${drone.id}`, {
      method: "DELETE",
    });
    fetchDrones();
  }

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Drones</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Drone
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 space-y-3"
        >
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Serial Number
            </label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="4TADL1234567890"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Friendly Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Matrice 4T Unit 1"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Serial Number</th>
                <th className="text-left px-4 py-3 font-medium">Model</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Last Seen</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drones.map((drone) => (
                <tr
                  key={drone.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="px-4 py-3 font-medium">{drone.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {drone.serial_number}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{drone.model}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={drone.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {drone.last_seen_at
                      ? new Date(drone.last_seen_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(drone)}
                      className="p-1 hover:bg-red-900/50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
              {drones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No drones registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
