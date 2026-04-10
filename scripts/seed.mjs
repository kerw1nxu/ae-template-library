import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const databasePath = path.resolve(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "db.sqlite"));
const customTagGroup = "自定义";
const systemTagGroups = [
  ["用途", ["年会", "开场", "片头", "图文包装", "数据展示", "LOGO演绎"]],
  ["风格", ["科技", "大气", "红金", "简洁", "国潮", "三维"]],
  ["行业", ["政企", "教育", "医疗", "地产", "汽车", "互联网"]],
  ["规格", ["16:9", "竖版", "4K", "1080p"]],
];

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
      PRIMARY KEY (template_id, tag_id)
    );
  `);

  const templateColumns = toRows(db, "PRAGMA table_info(templates)");
  const names = new Set(templateColumns.map((item) => String(item.name)));
  if (!names.has("source_path_key")) {
    db.run("ALTER TABLE templates ADD COLUMN source_path_key TEXT");
  }
  if (!names.has("import_mode")) {
    db.run("ALTER TABLE templates ADD COLUMN import_mode TEXT");
  }

  for (const [groupName, tags] of systemTagGroups) {
    for (const tag of tags) {
      db.run(
        `
          INSERT INTO tags (name, group_name, is_system)
          VALUES (?, ?, 1)
          ON CONFLICT(name) DO UPDATE SET
            group_name = excluded.group_name,
            is_system = excluded.is_system
        `,
        [tag, groupName],
      );
    }
  }

  const customCount = toRows(
    db,
    "SELECT COUNT(*) as count FROM tags WHERE group_name = ?",
    [customTagGroup],
  )[0]?.count;

  if (!customCount) {
    db.run(
      "INSERT OR IGNORE INTO tags (name, group_name, is_system) VALUES ('__custom_placeholder__', ?, 0)",
      [customTagGroup],
    );
    db.run("DELETE FROM tags WHERE name = '__custom_placeholder__'");
  }

  await persistDatabase(db);

  const templateCount = toRows(db, "SELECT COUNT(*) as count FROM templates")[0]?.count ?? 0;
  const tagCount = toRows(db, "SELECT COUNT(*) as count FROM tags")[0]?.count ?? 0;

  console.log("数据库已初始化");
  console.log(`模板数量: ${templateCount}`);
  console.log(`标签总量: ${tagCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
