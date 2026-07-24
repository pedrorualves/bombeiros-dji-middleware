export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export type UserRole = "super_admin" | "org_admin" | "operator";

export interface UserPublic {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Drone {
  id: string;
  org_id: string;
  serial_number: string;
  name: string;
  model: string;
  status: DroneStatus;
  last_seen_at: string | null;
  created_at: string;
}

export type DroneStatus = "online" | "offline";

export interface ArcGISConfig {
  id: string;
  org_id: string;
  feature_service_url: string;
  points_layer_id: number;
  polygons_layer_id: number | null;
  polylines_layer_id: number | null;
  auth_type: ArcGISAuthType;
  username: string | null;
  password_encrypted: string | null;
  client_id: string | null;
  client_secret_encrypted: string | null;
  sync_interval_seconds: number;
  created_at: string;
  updated_at: string;
}

export type ArcGISAuthType = "token" | "oauth";

export interface SyncLog {
  id: string;
  org_id: string;
  drone_sn: string;
  sync_type: SyncType;
  status: SyncStatus;
  arcgis_object_id: number | null;
  error_message: string | null;
  created_at: string;
}

export type SyncType = "telemetry" | "photo" | "video" | "map_element";
export type SyncStatus = "success" | "failed";

export interface MediaRecord {
  id: string;
  org_id: string;
  drone_sn: string;
  r2_key: string;
  filename: string;
  media_type: MediaType;
  camera: string;
  latitude: number;
  longitude: number;
  altitude: number;
  file_size_bytes: number;
  fingerprint: string;
  arcgis_synced: boolean;
  arcgis_object_id: number | null;
  created_at: string;
}

export type MediaType = "photo" | "video" | "thermal" | "panorama";

export interface JWTPayload {
  sub: string;
  org_id: string;
  role: UserRole;
  exp: number;
  iat: number;
}
