# DJI → ArcGIS Middleware

Middleware that bridges DJI Matrice 4T drones (via DJI Cloud API) to ArcGIS Online Feature Layers, enabling multi-tenant organizations to push real-time telemetry, photos, videos, and map elements directly to their ArcGIS feature services.

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
npm run dev -w packages/worker-api

# Start Admin UI (port 5173)
npm run dev -w packages/admin-ui

# Run DJI simulator (mock telemetry)
npm run telemetry -w packages/dji-simulator

# Simulate media uploads
npm run upload -w packages/dji-simulator
```

### Deploy to Cloudflare

```bash
# 1. Create D1 database
npx wrangler d1 create dji-middleware-db

# 2. Create R2 bucket
npx wrangler r2 bucket create dji-media

# 3. Create KV namespace
npx wrangler kv namespace create SESSION_STORE

# 4. Update wrangler.jsonc with the IDs from steps 1-3

# 5. Run D1 migrations
npx wrangler d1 execute dji-middleware-db --file=packages/worker-api/src/db/schema.sql

# 6. Set secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_ACCESS_KEY_SECRET
npx wrangler secret put R2_ACCOUNT_ID

# 7. Deploy
npx wrangler deploy -c packages/worker-api/wrangler.jsonc
```

### Environment Variables

See `packages/worker-api/.dev.vars.example` for all required secrets.

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random string for HMAC-SHA256 JWT signing |
| `WEBHOOK_SECRET` | Shared secret between EMQX and Worker |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-GCM encryption of ArcGIS credentials |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible API key ID |
| `R2_ACCESS_KEY_SECRET` | R2 S3-compatible API secret |
| `R2_ACCOUNT_ID` | Cloudflare account ID |

### EMQX Webhook Setup

Configure EMQX rule engine to forward MQTT messages to the Worker:

1. **Telemetry** (OSD data):
   - Topic: `thing/product/+/osd`
   - HTTP Action: `POST https://YOUR_DOMAIN/api/ingest/telemetry`
   - Header: `X-Webhook-Secret: <your-webhook-secret>`

2. **Events** (flight events):
   - Topic: `thing/product/+/events`
   - HTTP Action: `POST https://YOUR_DOMAIN/api/ingest/events`
   - Header: `X-Webhook-Secret: <your-webhook-secret>`

3. **Status** (online/offline):
   - Topic: `sys/product/+/status`
   - HTTP Action: `POST https://YOUR_DOMAIN/api/ingest/status`
   - Header: `X-Webhook-Secret: <your-webhook-secret>`

### DJI Pilot 2 Configuration

In DJI Pilot 2 settings, set the cloud service URL to:
```
https://YOUR_DOMAIN/manage
```

The webview will call `/manage/api/v1/login` and the media upload flow will use `/media/api/v1/workspaces/:wsId/*`.

### First-Time Setup

1. Deploy the Worker and open the Admin UI
2. The login page detects an empty database and shows "First time setup"
3. Enter your email and a password (min 8 chars) to create the super_admin account
4. Add organizations, register drones, and configure ArcGIS credentials per org

## Project Structure

```
packages/
├── shared/          # Types, constants, Zod schemas
├── worker-api/      # Cloudflare Worker (Hono router)
│   └── src/
│       ├── routes/       # Auth, orgs, drones, arcgis, ingest, DJI
│       ├── services/     # Crypto, ArcGIS sync
│       ├── middleware/   # JWT auth, role check, org access
│       └── db/           # Schema + query helpers
├── admin-ui/        # React admin dashboard
│   └── src/
│       ├── pages/        # Dashboard, orgs, drones, config, media, logs
│       └── components/   # Layout, sidebar, status badges
└── dji-simulator/   # Mock DJI drone for local testing
```
