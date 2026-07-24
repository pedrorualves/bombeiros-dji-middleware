import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import { useAuth } from "../auth-context";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login, bootstrap, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetch(`${API_BASE}/api/auth/me`)
      .then((r) => {
        if (r.status === 401) {
          return r.json().then(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
          .then((r) => {
            if (r.status === 400) {
              setIsBootstrap(true);
            }
          })
          .catch(() => {})
          .finally(() => setChecking(false));
      });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (isBootstrap) {
        await bootstrap(email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-red-600 p-3 rounded-full mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            DJI Middleware
          </h1>
          <p className="text-slate-400 mt-1">DJI Matrice 4T → ArcGIS</p>
        </div>

        {isBootstrap && (
          <div className="bg-amber-900/50 border border-amber-700 text-amber-300 px-4 py-2 rounded-lg text-sm mb-4">
            First time setup — create your admin account.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password{isBootstrap && " (min 8 characters)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isBootstrap ? 8 : 6}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading
              ? isBootstrap
                ? "Creating account..."
                : "Signing in..."
              : isBootstrap
                ? "Create Admin Account"
                : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
