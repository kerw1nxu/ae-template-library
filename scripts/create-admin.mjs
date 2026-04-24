import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import initSqlJs from "sql.js";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
    return null;
  }
  const index = trimmed.indexOf("=");
  return {
    key: trimmed.slice(0, index).trim(),
    value: trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
  };
}

async function loadEnvFile(fileName, overwrite = true) {
  try {
    const text = await fs.readFile(path.join(process.cwd(), fileName), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed && (overwrite || process.env[parsed.key] === undefined)) {
        process.env[parsed.key] = parsed.value;
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

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

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

async function loadDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  try {
    return new SQL.Database(await fs.readFile(databasePath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return new SQL.Database();
  }
}

function ensureUserTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      disabled_at TEXT
    );
  `);

  const columns = new Set(toRows(db, "PRAGMA table_info(users)").map((row) => String(row.name)));
  const missingColumns = [
    ["role", "TEXT NOT NULL DEFAULT 'user'"],
    ["created_at", "TEXT"],
    ["updated_at", "TEXT"],
    ["disabled_at", "TEXT"],
  ].filter(([name]) => !columns.has(name));

  for (const [name, definition] of missingColumns) {
    db.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  }
}

async function main() {
  let username = process.env.ADMIN_USERNAME ?? readArg("username") ?? "";
  let password = process.env.ADMIN_PASSWORD ?? readArg("password") ?? "";

  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    if (!username) {
      username = await rl.question("Admin username: ");
    }
    if (!password) {
      password = await rl.question("Admin password (at least 8 chars): ");
    }
    rl.close();
  }

  username = username.trim();

  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 chars: letters, numbers, dot, underscore, or dash.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 chars.");
  }

  const db = await loadDatabase();
  ensureUserTable(db);

  const now = new Date().toISOString();
  const existing = toRows(db, "SELECT id FROM users WHERE username = ?", [username])[0];
  if (existing) {
    db.run(
      `
        UPDATE users
        SET password_hash = ?, role = 'admin', disabled_at = NULL, updated_at = ?
        WHERE id = ?
      `,
      [hashPassword(password), now, existing.id],
    );
  } else {
    db.run(
      `
        INSERT INTO users (id, username, password_hash, role, created_at, updated_at, disabled_at)
        VALUES (?, ?, ?, 'admin', ?, ?, NULL)
      `,
      [randomUUID(), username, hashPassword(password), now, now],
    );
  }

  await persistDatabase(db);
  console.log(`${existing ? "Admin updated" : "Admin created"}: ${username}`);
  console.log(`Database: ${databasePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
