import type {
  Org,
  User,
  Drone,
  ArcGISConfig,
  SyncLog,
  MediaRecord,
  SyncType,
  SyncStatus,
} from "@bombeiros/shared";

type DB = D1Database;

export async function getOrgById(db: DB, id: string): Promise<Org | null> {
  return db.prepare("SELECT * FROM orgs WHERE id = ?").bind(id).first<Org>();
}

export async function getOrgBySlug(
  db: DB,
  slug: string
): Promise<Org | null> {
  return db
    .prepare("SELECT * FROM orgs WHERE slug = ?")
    .bind(slug)
    .first<Org>();
}

export async function listOrgs(db: DB): Promise<Org[]> {
  const result = await db
    .prepare("SELECT * FROM orgs ORDER BY created_at DESC")
    .all<Org>();
  return result.results;
}

export async function createOrg(
  db: DB,
  id: string,
  name: string,
  slug: string
): Promise<Org> {
  await db
    .prepare("INSERT INTO orgs (id, name, slug) VALUES (?, ?, ?)")
    .bind(id, name, slug)
    .run();
  return (await getOrgById(db, id))!;
}

export async function updateOrg(
  db: DB,
  id: string,
  name: string
): Promise<Org> {
  await db
    .prepare(
      "UPDATE orgs SET name = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(name, id)
    .run();
  return (await getOrgById(db, id))!;
}

export async function deleteOrg(db: DB, id: string): Promise<void> {
  await db.prepare("DELETE FROM orgs WHERE id = ?").bind(id).run();
}

export async function getUserByEmail(
  db: DB,
  email: string
): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<User>();
}

export async function getUserById(
  db: DB,
  id: string
): Promise<User | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
}

export async function createUser(
  db: DB,
  id: string,
  orgId: string,
  email: string,
  passwordHash: string,
  role: string
): Promise<User> {
  await db
    .prepare(
      "INSERT INTO users (id, org_id, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, orgId, email, passwordHash, role)
    .run();
  return (await getUserById(db, id))!;
}

export async function countUsers(db: DB): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM users")
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function getDroneBySerialNumber(
  db: DB,
  serialNumber: string
): Promise<Drone | null> {
  return db
    .prepare("SELECT * FROM drones WHERE serial_number = ?")
    .bind(serialNumber)
    .first<Drone>();
}

export async function getDronesByOrg(
  db: DB,
  orgId: string
): Promise<Drone[]> {
  const result = await db
    .prepare("SELECT * FROM drones WHERE org_id = ? ORDER BY created_at DESC")
    .bind(orgId)
    .all<Drone>();
  return result.results;
}

export async function createDrone(
  db: DB,
  id: string,
  orgId: string,
  serialNumber: string,
  name: string,
  model: string
): Promise<Drone> {
  await db
    .prepare(
      "INSERT INTO drones (id, org_id, serial_number, name, model) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, orgId, serialNumber, name, model)
    .run();
  return (await getDroneById(db, id))!;
}

export async function getDroneById(
  db: DB,
  id: string
): Promise<Drone | null> {
  return db
    .prepare("SELECT * FROM drones WHERE id = ?")
    .bind(id)
    .first<Drone>();
}

export async function updateDrone(
  db: DB,
  id: string,
  name: string
): Promise<Drone> {
  await db
    .prepare("UPDATE drones SET name = ? WHERE id = ?")
    .bind(name, id)
    .run();
  return (await getDroneById(db, id))!;
}

export async function deleteDrone(db: DB, id: string): Promise<void> {
  await db.prepare("DELETE FROM drones WHERE id = ?").bind(id).run();
}

export async function updateDroneStatus(
  db: DB,
  serialNumber: string,
  status: string,
  lastSeenAt: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE drones SET status = ?, last_seen_at = ? WHERE serial_number = ?"
    )
    .bind(status, lastSeenAt, serialNumber)
    .run();
}

export async function getArcGISConfigByOrg(
  db: DB,
  orgId: string
): Promise<ArcGISConfig | null> {
  return db
    .prepare("SELECT * FROM arcgis_configs WHERE org_id = ?")
    .bind(orgId)
    .first<ArcGISConfig>();
}

export async function upsertArcGISConfig(
  db: DB,
  id: string,
  orgId: string,
  config: {
    feature_service_url: string;
    points_layer_id: number;
    polygons_layer_id: number | null;
    polylines_layer_id: number | null;
    auth_type: string;
    username: string | null;
    password_encrypted: string | null;
    client_id: string | null;
    client_secret_encrypted: string | null;
    sync_interval_seconds: number;
  }
): Promise<ArcGISConfig> {
  await db
    .prepare(
      `INSERT INTO arcgis_configs (id, org_id, feature_service_url, points_layer_id, polygons_layer_id, polylines_layer_id, auth_type, username, password_encrypted, client_id, client_secret_encrypted, sync_interval_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_id) DO UPDATE SET
         feature_service_url = excluded.feature_service_url,
         points_layer_id = excluded.points_layer_id,
         polygons_layer_id = excluded.polygons_layer_id,
         polylines_layer_id = excluded.polylines_layer_id,
         auth_type = excluded.auth_type,
         username = excluded.username,
         password_encrypted = excluded.password_encrypted,
         client_id = excluded.client_id,
         client_secret_encrypted = excluded.client_secret_encrypted,
         sync_interval_seconds = excluded.sync_interval_seconds,
         updated_at = datetime('now')`
    )
    .bind(
      id,
      orgId,
      config.feature_service_url,
      config.points_layer_id,
      config.polygons_layer_id,
      config.polylines_layer_id,
      config.auth_type,
      config.username,
      config.password_encrypted,
      config.client_id,
      config.client_secret_encrypted,
      config.sync_interval_seconds
    )
    .run();
  return (await getArcGISConfigByOrg(db, orgId))!;
}

export async function createSyncLog(
  db: DB,
  id: string,
  orgId: string,
  droneSn: string,
  syncType: SyncType,
  status: SyncStatus,
  arcgisObjectId: number | null,
  errorMessage: string | null
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sync_logs (id, org_id, drone_sn, sync_type, status, arcgis_object_id, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, orgId, droneSn, syncType, status, arcgisObjectId, errorMessage)
    .run();
}

export async function getSyncLogs(
  db: DB,
  orgId: string,
  page: number,
  perPage: number,
  filters?: { sync_type?: string; status?: string; drone_sn?: string }
): Promise<{ logs: SyncLog[]; total: number }> {
  let where = "WHERE org_id = ?";
  const params: (string | number)[] = [orgId];

  if (filters?.sync_type) {
    where += " AND sync_type = ?";
    params.push(filters.sync_type);
  }
  if (filters?.status) {
    where += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.drone_sn) {
    where += " AND drone_sn = ?";
    params.push(filters.drone_sn);
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM sync_logs ${where}`)
    .bind(...params)
    .first<{ count: number }>();
  const total = countResult?.count ?? 0;

  const offset = (page - 1) * perPage;
  const result = await db
    .prepare(
      `SELECT * FROM sync_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, perPage, offset)
    .all<SyncLog>();

  return { logs: result.results, total };
}

export async function createMediaRecord(
  db: DB,
  record: {
    id: string;
    org_id: string;
    drone_sn: string;
    r2_key: string;
    filename: string;
    media_type: string;
    camera: string;
    latitude: number;
    longitude: number;
    altitude: number;
    file_size_bytes: number;
    fingerprint: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO media (id, org_id, drone_sn, r2_key, filename, media_type, camera, latitude, longitude, altitude, file_size_bytes, fingerprint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      record.org_id,
      record.drone_sn,
      record.r2_key,
      record.filename,
      record.media_type,
      record.camera,
      record.latitude,
      record.longitude,
      record.altitude,
      record.file_size_bytes,
      record.fingerprint
    )
    .run();
}

export async function getMediaById(
  db: DB,
  id: string
): Promise<MediaRecord | null> {
  return db
    .prepare("SELECT * FROM media WHERE id = ?")
    .bind(id)
    .first<MediaRecord>();
}

export async function getMediaByFingerprint(
  db: DB,
  fingerprint: string
): Promise<MediaRecord | null> {
  return db
    .prepare("SELECT * FROM media WHERE fingerprint = ?")
    .bind(fingerprint)
    .first<MediaRecord>();
}

export async function updateMediaSyncStatus(
  db: DB,
  id: string,
  arcgisObjectId: number
): Promise<void> {
  await db
    .prepare(
      "UPDATE media SET arcgis_synced = 1, arcgis_object_id = ? WHERE id = ?"
    )
    .bind(arcgisObjectId, id)
    .run();
}

export async function getMediaByOrg(
  db: DB,
  orgId: string,
  page: number,
  perPage: number
): Promise<{ media: MediaRecord[]; total: number }> {
  const countResult = await db
    .prepare("SELECT COUNT(*) as count FROM media WHERE org_id = ?")
    .bind(orgId)
    .first<{ count: number }>();
  const total = countResult?.count ?? 0;

  const offset = (page - 1) * perPage;
  const result = await db
    .prepare(
      "SELECT * FROM media WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(orgId, perPage, offset)
    .all<MediaRecord>();

  return { media: result.results, total };
}
