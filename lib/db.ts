import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { CUSTOM_TAG_GROUP, SYSTEM_TAG_GROUPS } from "@/lib/constants";
import { DATABASE_PATH } from "@/lib/env";

type SqlValue = string | number | null;

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

async function runMigrations(db: Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnail_path TEXT NOT NULL,
      preview_video_path TEXT NOT NULL,
      template_file_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      uploaded_by TEXT NOT NULL DEFAULT 'LAN User'
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_name TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS template_tags (
      template_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (template_id, tag_id),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tags_group_name ON tags(group_name);
    CREATE INDEX IF NOT EXISTS idx_template_tags_template_id ON template_tags(template_id);
    CREATE INDEX IF NOT EXISTS idx_template_tags_tag_id ON template_tags(tag_id);
  `);

  const templateColumns = toRows<{ name: string }>(db, "PRAGMA table_info(templates)");
  const templateColumnNames = new Set(templateColumns.map((item) => String(item.name)));

  if (!templateColumnNames.has("source_path_key")) {
    db.run("ALTER TABLE templates ADD COLUMN source_path_key TEXT");
  }

  if (!templateColumnNames.has("import_mode")) {
    db.run("ALTER TABLE templates ADD COLUMN import_mode TEXT");
  }

  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_source_path_key ON templates(source_path_key)");

  for (const group of SYSTEM_TAG_GROUPS) {
    for (const name of group.tags) {
      db.run(
        `
          INSERT INTO tags (name, group_name, is_system)
          VALUES (?, ?, 1)
          ON CONFLICT(name) DO UPDATE SET
            group_name = excluded.group_name,
            is_system = excluded.is_system
        `,
        [name, group.groupName],
      );
    }
  }

  const customGroupCount = toRows<{ count: number }>(
    db,
    "SELECT COUNT(*) as count FROM tags WHERE group_name = ?",
    [CUSTOM_TAG_GROUP],
  )[0]?.count;

  if (!customGroupCount) {
    db.run(
      "INSERT OR IGNORE INTO tags (name, group_name, is_system) VALUES ('__custom_placeholder__', ?, 0)",
      [CUSTOM_TAG_GROUP],
    );
    db.run("DELETE FROM tags WHERE name = '__custom_placeholder__'");
  }
}

async function createDatabase() {
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

  await runMigrations(db);
  await persistDatabase(db);
  return db;
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = createDatabase();
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
