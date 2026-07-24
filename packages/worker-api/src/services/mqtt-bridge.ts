import type { Env } from "../bindings.js";

interface MQTTPublishOptions {
  topic: string;
  payload: Record<string, unknown>;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export async function publishMQTT(
  env: Env,
  options: MQTTPublishOptions
): Promise<void> {
  const { topic, payload, qos = 1, retain = false } = options;

  const url = `http://${env.EMQX_HOST}:18083/api/v5/publish`;
  const auth = btoa(`${env.EMQX_API_KEY}:${env.EMQX_API_SECRET}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      topic,
      payload: JSON.stringify(payload),
      qos,
      retain,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EMQX publish failed (${res.status}): ${body}`);
  }
}

export function buildDJIServiceTopic(productSn: string, method: string): string {
  return `thing/product/${productSn}/services`;
}

export function buildDJIRequestTopic(productSn: string): string {
  return `thing/product/${productSn}/requests`;
}

export async function sendDJICommand(
  env: Env,
  droneSn: string,
  method: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const topic = buildDJIServiceTopic(droneSn, method);
  const payload = {
    tid: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    bid: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    method,
    timestamp: Math.floor(Date.now() / 1000),
    data,
  };

  await publishMQTT(env, { topic, payload, qos: 1 });
}
