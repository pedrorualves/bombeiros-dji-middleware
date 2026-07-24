import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";

interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export function OrgsPage() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ orgs: Org[] }>("/api/orgs");
      setOrgs(data.orgs);
    } catch {
      // handled by apiFetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingOrg) {
        await apiFetch(`/api/orgs/${editingOrg.id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
      } else {
        const { status, data } = await apiFetch<{ error?: string }>("/api/orgs", {
          method: "POST",
          body: JSON.stringify({ name, slug }),
        });
        if (status >= 400) {
          setError(data.error || "Failed");
          return;
        }
      }
      setShowForm(false);
      setEditingOrg(null);
      setName("");
      setSlug("");
      fetchOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDelete(org: Org) {
    if (!confirm(`Delete "${org.name}"? This will remove all its data.`)) return;
    await apiFetch(`/api/orgs/${org.id}`, { method: "DELETE" });
    fetchOrgs();
  }

  if (user?.role !== "super_admin") {
    return (
      <div className="p-6 text-slate-400">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Organizations</h2>
        <button
          onClick={() => {
            setEditingOrg(null);
            setName("");
            setSlug("");
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Organization
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
            <label className="block text-sm text-slate-300 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="My Organization"
            />
          </div>
          {!editingOrg && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">Slug</label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                required
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="bv-lisboa"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              {editingOrg ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingOrg(null);
              }}
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
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 text-slate-400">{org.slug}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingOrg(org);
                        setName(org.name);
                        setShowForm(true);
                      }}
                      className="p-1 hover:bg-slate-600 rounded mr-1"
                    >
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                    {org.slug !== "system" && (
                      <button
                        onClick={() => handleDelete(org)}
                        className="p-1 hover:bg-red-900/50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No organizations yet.
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
