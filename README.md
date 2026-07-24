# Bombeiros DJI Middleware

Middleware that bridges DJI Matrice 4T drones (via DJI Cloud API) to ArcGIS Online Feature Layers, enabling Portuguese firefighter departments to push real-time telemetry, photos, videos, and map elements directly to the ANEPC national platform.

## Architecture

```
DJI Pilot 2 ──MQTT──▶ EMQX (Proxmox) ──webhook──▶ CF Worker ──REST──▶ ArcGIS Online
     │                                                 │
     └──S3 PUT──▶ Cloudflare R2 (media) ◀──stream──────┘
```

- **Cloudflare Workers** — API, DJI HTTPS endpoints, ArcGIS sync
- **Cloudflare Pages** — Admin UI (React)
- **Cloudflare D1** — Database (orgs, users, drones, configs)
- **Cloudflare R2** — Drone photo/video storage
- **Cloudflare KV** — Sessions, cached tokens
- **EMQX** — Self-hosted MQTT broker (Proxmox LXC)

## Quick Start

### Prerequisites

- Node.js >= 18
- Cloudflare account (free tier)
- DJI developer account (developer.dji.com)
- EMQX 5.x on Proxmox LXC
- ArcGIS Online with Feature Layers (attachments enabled)

### Install

```bash
npm install
```

### Development

```bash
# Start Worker API (port 8787)
npm run dev:api

# Start Admin UI (port 5173)
npm run dev:ui
```

### Environment Variables

See `packages/worker-api/.dev.vars.example` for required secrets.

## Documentation

- [EMQX Setup](docs/setup-emqx.md)
- [DJI Developer Setup](docs/setup-dji-developer.md)
- [ArcGIS Layer Requirements](docs/setup-arcgis-layers.md)
- [Onboarding a New Department](docs/onboarding-new-org.md)
- [Architecture](docs/architecture.md)
