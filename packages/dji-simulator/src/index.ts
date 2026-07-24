import { CONFIG } from "./config.js";

console.log(`
╔══════════════════════════════════════════╗
║       DJI Matrice 4T Simulator           ║
╠══════════════════════════════════════════╣
║  Drone SN:  ${CONFIG.DRONE_SN.padEnd(28)}║
║  Target:    ${CONFIG.BASE_URL.padEnd(28)}║
║  Interval:  ${(CONFIG.INTERVAL_MS + "ms").padEnd(28)}║
╚══════════════════════════════════════════╝

Usage:
  npm run telemetry   — Stream mock OSD telemetry
  npm run upload      — Simulate media upload callbacks
  npm run upload -- 5 — Simulate 5 media uploads
`);
