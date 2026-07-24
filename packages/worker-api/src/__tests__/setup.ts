import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";

export { env, createExecutionContext, waitOnExecutionContext };

export async function fetchApp(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<Response> {
  const { default: app } = await import("../index.js");
  const url = new URL(path, "http://localhost");
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  const ctx = createExecutionContext();
  const res = await app.fetch(
    new Request(url.toString(), { ...init, headers }),
    env,
    ctx
  );
  await waitOnExecutionContext(ctx);
  return res;
}
