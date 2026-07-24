import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Shield } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";

interface UserPublic {
  id: string;
  org_id: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  operator: "Operator",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-600/20 text-red-400",
  org_admin: "bg-amber-600/20 text-amber-400",
  operator: "bg-blue-600/20 text-blue-400",
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const orgId = currentUser?.org_id;
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "operator" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data } = await apiFetch<{ users: UserPublic[] }>(
        `/api/orgs/${orgId}/users`
      );
      setUsers(data.users);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/orgs/${orgId}/users`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ email: "", password: "", role: "operator" });
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!orgId) return;
    try {
      await apiFetch(`/api/orgs/${orgId}/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch {
      // handled
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!orgId || !confirm(`Remove ${email} from this organization?`)) return;
    try {
      await apiFetch(`/api/orgs/${orgId}/users/${userId}`, {
        method: "DELETE",
      });
      fetchUsers();
    } catch {
      // handled
    }
  }

  const canManage =
    currentUser?.role === "super_admin" || currentUser?.role === "org_admin";

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Users</h2>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 space-y-3"
        >
          <h3 className="font-semibold">New User</h3>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="operator">Operator</option>
              <option value="org_admin">Org Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">No users in this organization yet.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-sm text-slate-400 font-medium">Email</th>
                <th className="text-left p-3 text-sm text-slate-400 font-medium">Role</th>
                <th className="text-left p-3 text-sm text-slate-400 font-medium">Joined</th>
                {canManage && (
                  <th className="text-right p-3 text-sm text-slate-400 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isSuperAdmin = u.role === "super_admin";
                return (
                  <tr key={u.id} className="border-b border-slate-700/50 last:border-0">
                    <td className="p-3 text-sm">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-slate-500">(you)</span>
                      )}
                    </td>
                    <td className="p-3">
                      {canManage && !isSelf && !isSuperAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="operator">Operator</option>
                          <option value="org_admin">Org Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            ROLE_COLORS[u.role] ?? "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {isSuperAdmin && <Shield className="w-3 h-3" />}
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="p-3 text-right">
                        {!isSelf && !isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
