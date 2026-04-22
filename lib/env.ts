import path from "node:path";
import { SESSION_TTL_DAYS } from "@/lib/constants";

export const DATABASE_PATH = path.resolve(
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "db.sqlite"),
);

export const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_ROOT ?? path.join(process.cwd(), "data", "ae-templates"),
);

export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "http://127.0.0.1:3000";

export const SCAN_ROOT = path.resolve(
  process.env.SCAN_ROOT ?? path.join(STORAGE_ROOT, "imports"),
);

export const AUTH_SECRET = process.env.AUTH_SECRET ?? "change-me-before-production";
export const INITIAL_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME?.trim() ?? "";
export const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD?.trim() ?? "";
export const SESSION_TTL_MS = Number(
  process.env.SESSION_TTL_MS ?? SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
);

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
