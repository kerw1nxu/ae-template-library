import path from "node:path";

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

export const PUBLIC_ACCESS_MODE = process.env.PUBLIC_ACCESS_MODE ?? "list";

export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" ||
  (!process.env.COOKIE_SECURE && process.env.NODE_ENV === "production");

export const TRUST_PROXY = process.env.TRUST_PROXY === "true";
