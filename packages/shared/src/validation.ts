import { z } from "zod";

export const CreateOrgInput = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
});
export type CreateOrgInput = z.infer<typeof CreateOrgInput>;

export const UpdateOrgInput = z.object({
  name: z.string().min(2).max(200),
});
export type UpdateOrgInput = z.infer<typeof UpdateOrgInput>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  org_id: z.string().uuid(),
  role: z.enum(["org_admin", "operator"]),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const DroneRegistrationInput = z.object({
  serial_number: z.string().min(5).max(30),
  name: z.string().min(1).max(100),
  model: z.string().default("matrice_4t"),
});
export type DroneRegistrationInput = z.infer<typeof DroneRegistrationInput>;

export const ArcGISConfigInput = z.object({
  feature_service_url: z.string().url(),
  points_layer_id: z.number().int().min(0).default(0),
  polygons_layer_id: z.number().int().min(0).nullable().default(null),
  polylines_layer_id: z.number().int().min(0).nullable().default(null),
  auth_type: z.enum(["token", "oauth"]),
  username: z.string().nullable().default(null),
  password: z.string().nullable().default(null),
  client_id: z.string().nullable().default(null),
  client_secret: z.string().nullable().default(null),
  sync_interval_seconds: z.number().int().min(1).max(300).default(10),
});
export type ArcGISConfigInput = z.infer<typeof ArcGISConfigInput>;

export const PaginationInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});
export type PaginationInput = z.infer<typeof PaginationInput>;
