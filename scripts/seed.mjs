import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const customTagGroup = "自定义";
const systemTagGroups = [
  ["用途", ["年会", "开场", "片头", "图文包装", "数据展示", "LOGO演绎"]],
  ["风格", ["科技", "大气", "红金", "简洁", "国潮", "三维"]],
  ["行业", ["政企", "教育", "医疗", "地产", "汽车", "互联网"]],
  ["规格", ["16:9", "竖版", "4K", "1080p"]],
];

async function loadEnvFile(fileName, overwrite = true) {
  try {
    const text = await fs.readFile(path.join(process.cwd(), fileName), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (overwrite || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

await loadEnvFile(".env.local", false);
if (process.env.NODE_ENV !== "production") {
  await loadEnvFile(".env.development.local", true);
}

const databasePath = path.resolve(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "dev-db.sqlite"));

function toRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  if (params.length > 0) {
    statement.bind(params);
  }
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

async function persistDatabase(db) {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.writeFile(databasePath, db.export());
}

function createSchema(db) {
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
  `);
}

function seedSystemTags(db) {
  const now = new Date().toISOString();
  for (const [groupIndex, [groupName, tags]] of systemTagGroups.entries()) {
    db.run(
      `
        INSERT INTO tag_groups (name, sort_order, is_enabled, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order, updated_at = excluded.updated_at
      `,
      [groupName, groupIndex * 10, now, now],
    );

    for (const [tagIndex, tagName] of tags.entries()) {
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
        [tagName, groupName, tagIndex * 10, now, now],
      );
    }
  }

  db.run(
    `
      INSERT INTO tag_groups (name, sort_order, is_enabled, created_at, updated_at)
      VALUES (?, 1000, 1, ?, ?)
      ON CONFLICT(name) DO UPDATE SET updated_at = excluded.updated_at
    `,
    [customTagGroup, now, now],
  );
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  let db;
  try {
    db = new SQL.Database(await fs.readFile(databasePath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    db = new SQL.Database();
  }

  createSchema(db);
  seedSystemTags(db);
  await persistDatabase(db);

  const templateCount = toRows(db, "SELECT COUNT(*) as count FROM templates")[0]?.count ?? 0;
  const tagCount = toRows(db, "SELECT COUNT(*) as count FROM tags")[0]?.count ?? 0;
  console.log("数据库已初始化");
  console.log(`Database: ${databasePath}`);
  console.log(`模板数量: ${templateCount}`);
  console.log(`标签总量: ${tagCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
