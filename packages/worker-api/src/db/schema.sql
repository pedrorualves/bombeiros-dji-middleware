CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'operator')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drones (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'matrice_4t',
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS arcgis_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE REFERENCES orgs(id) ON DELETE CASCADE,
  feature_service_url TEXT NOT NULL,
  points_layer_id INTEGER NOT NULL DEFAULT 0,
  polygons_layer_id INTEGER,
  polylines_layer_id INTEGER,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('token', 'oauth')),
  username TEXT,
  password_encrypted TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT,
  sync_interval_seconds INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  drone_sn TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('telemetry', 'photo', 'video', 'map_element')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  arcgis_object_id INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  drone_sn TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'thermal', 'panorama')),
  camera TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  arcgis_synced INTEGER NOT NULL DEFAULT 0,
  arcgis_object_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_drones_org_id ON drones(org_id);
CREATE INDEX IF NOT EXISTS idx_drones_serial_number ON drones(serial_number);
CREATE INDEX IF NOT EXISTS idx_sync_logs_org_id ON sync_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_media_org_id ON media(org_id);
CREATE INDEX IF NOT EXISTS idx_media_fingerprint ON media(fingerprint);
