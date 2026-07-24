const API_BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): { id: string; org_id: string; email: string; role: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; org_id: string; email: string; role: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number; renewedToken?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const renewedToken = res.headers.get("X-Renewed-Token");
  if (renewedToken) {
    setToken(renewedToken);
  }

  const data = await res.json() as T;
  return { data, status: res.status, renewedToken: renewedToken ?? undefined };
}
