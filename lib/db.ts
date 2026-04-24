import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { CUSTOM_TAG_GROUP, SYSTEM_TAG_GROUPS } from "@/lib/constants";
import { DATABASE_PATH } from "@/lib/env";

export type SqlValue = string | number | null;

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }

  return sqlJsPromise;
}

function toRows<T extends Record<string, unknown>>(db: Database, sql: string, params: SqlValue[] = []) {
  const statement = db.prepare(sql);
  if (params.length > 0) {
    statement.bind(params);
  }

  const rows: T[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }
  statement.free();

  return rows;
}

async function persistDatabase(db: Database) {
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  await fs.writeFile(DATABASE_PATH, db.export());
}

function createV1Schema(db: Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      disabled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tag_groups (
      name TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_name TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_name) REFERENCES tag_groups(name) ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnail_path TEXT NOT NULL,
      preview_video_path TEXT NOT NULL,
      template_file_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      source_path_key TEXT UNIQUE,
      import_mode TEXT,
      deleted_at TEXT,
      deleted_by TEXT
    );

    CREATE TABLE IF NOT EXISTS template_tags (
      template_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (template_id, tag_id),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS download_events (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_tags_group_name ON tags(group_name);
    CREATE INDEX IF NOT EXISTS idx_tags_enabled ON tags(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_tag_groups_enabled ON tag_groups(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON templates(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_template_tags_template_id ON template_tags(template_id);
    CREATE INDEX IF NOT EXISTS idx_template_tags_tag_id ON template_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_download_events_template_id ON download_events(template_id);
    CREATE INDEX IF NOT EXISTS idx_download_events_user_id ON download_events(user_id);
  `);
}

function seedSystemTags(db: Database) {
  const now = new Date().toISOString();

  for (const [groupIndex, group] of SYSTEM_TAG_GROUPS.entries()) {
    db.run(
      `
        INSERT INTO tag_groups (name, sort_order, is_enabled, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          sort_order = excluded.sort_order,
          is_enabled = 1,
          updated_at = excluded.updated_at
      `,
      [group.groupName, groupIndex * 10, now, now],
    );

    for (const [tagIndex, tagName] of group.tags.entries()) {
      db.run(
        `
          INSERT INTO tags (name, group_name, is_system, is_enabled, sort_order, created_at, updated_at)
          VALUES (?, ?, 1, 1, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            group_name = excluded.group_name,
            is_system = 1,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at
        `,
        [tagName, group.groupName, tagIndex * 10, now, now],
      );
    }
  }

  db.run(
    `
      INSERT INTO tag_groups (name, sort_order, is_enabled, created_at, updated_at)
      VALUES (?, 1000, 1, ?, ?)
      ON CONFLICT(name) DO UPDATE SET updated_at = excluded.updated_at
    `,
    [CUSTOM_TAG_GROUP, now, now],
  );
}

async function initializeDatabase() {
  const SQL = await getSqlJs();
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });

  let db: Database;
  try {
    db = new SQL.Database(await fs.readFile(DATABASE_PATH));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    db = new SQL.Database();
  }

  createV1Schema(db);
  seedSystemTags(db);
  await persistDatabase(db);
  return db;
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = initializeDatabase();
  }

  return dbPromise;
}

export async function queryAll<T extends Record<string, unknown>>(sql: string, params: SqlValue[] = []) {
  const db = await getDb();
  return toRows<T>(db, sql, params);
}

export async function queryFirst<T extends Record<string, unknown>>(sql: string, params: SqlValue[] = []) {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: SqlValue[] = []) {
  const db = await getDb();
  db.run(sql, params);
  await persistDatabase(db);
}

export async function transaction<T>(callback: (db: Database) => Promise<T> | T) {
  const db = await getDb();
  db.run("BEGIN");

  try {
    const result = await callback(db);
    db.run("COMMIT");
    await persistDatabase(db);
    return result;
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}
