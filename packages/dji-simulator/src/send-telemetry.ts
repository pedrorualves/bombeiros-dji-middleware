import { CONFIG } from "./config.js";

const LISBON_CENTER = { lat: 38.7223, lng: -9.1393 };
const RADIUS = 0.005;

let angle = 0;
let altitude = 100;
let battery = 100;
let iteration = 0;

function generateOSD() {
  angle += 0.1;
  altitude = 100 + Math.sin(angle * 0.5) * 30;
  battery = Math.max(10, 100 - iteration * 0.5);
  iteration++;

  return {
    sn: CONFIG.DRONE_SN,
    data: {
      latitude: LISBON_CENTER.lat + Math.sin(angle) * RADIUS,
      longitude: LISBON_CENTER.lng + Math.cos(angle) * RADIUS,
      height: altitude,
      horizontal_speed: 5 + Math.random() * 10,
      attitude_head: (angle * 180 / Math.PI) % 360,
      battery: {
        capacity_percent: Math.round(battery),
      },
    },
  };
}

async function sendTelemetry() {
  const osd = generateOSD();
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/api/ingest/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": CONFIG.WEBHOOK_SECRET,
      },
      body: JSON.stringify(osd),
    });
    const data = await res.json();
    console.log(
      `[${new Date().toISOString()}] Telemetry sent — ` +
      `lat=${osd.data.latitude.toFixed(5)} lng=${osd.data.longitude.toFixed(5)} ` +
      `alt=${osd.data.height.toFixed(0)}m bat=${osd.data.battery.capacity_percent}% → ${res.status}`,
      data
    );
  } catch (err) {
    console.error("Failed to send telemetry:", err);
  }
}

console.log(`🛩  DJI Simulator — Telemetry mode`);
console.log(`   Drone SN: ${CONFIG.DRONE_SN}`);
console.log(`   Target:   ${CONFIG.BASE_URL}`);
console.log(`   Interval: ${CONFIG.INTERVAL_MS}ms`);
console.log(`   Center:   ${LISBON_CENTER.lat}, ${LISBON_CENTER.lng}\n`);

sendTelemetry();
setInterval(sendTelemetry, CONFIG.INTERVAL_MS);
