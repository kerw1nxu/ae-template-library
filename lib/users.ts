import { randomUUID } from "node:crypto";
import { execute, queryAll, queryFirst, transaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { AdminUserRecord, UserRole } from "@/lib/types";

type UserRow = {
  id: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
};

function rowToUser(row: UserRow): AdminUserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) as UserRole,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    disabledAt: row.disabled_at ? String(row.disabled_at) : null,
  };
}

function normalizeUsername(username: string) {
  return username.trim();
}

function validateUsername(username: string) {
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
    throw new Error("账号只能使用 3-32 位英文、数字、点、下划线或短横线。");
  }
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("密码至少需要 8 位。");
  }
}

function validateRole(role: string): asserts role is UserRole {
  if (role !== "user" && role !== "admin") {
    throw new Error("账号角色无效。");
  }
}

async function activeAdminCount() {
  const row = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND disabled_at IS NULL",
  );
  return Number(row?.count ?? 0);
}

async function getUserRow(id: string) {
  return queryFirst<UserRow>(
    `
      SELECT id, username, role, created_at, updated_at, disabled_at
      FROM users
      WHERE id = ?
    `,
    [id],
  );
}

async function assertCanRemoveAdmin(id: string) {
  const user = await getUserRow(id);
  if (!user) {
    throw new Error("账号不存在。");
  }

  if (user.role === "admin" && !user.disabled_at && (await activeAdminCount()) <= 1) {
    throw new Error("不能停用或降级最后一个管理员。");
  }

  return user;
}

export async function listUsers() {
  const rows = await queryAll<UserRow>(
    `
      SELECT id, username, role, created_at, updated_at, disabled_at
      FROM users
      ORDER BY disabled_at IS NOT NULL ASC, role DESC, username COLLATE NOCASE ASC
    `,
  );

  return rows.map(rowToUser);
}

export async function createUser(input: { username: string; password: string; role: UserRole }) {
  const username = normalizeUsername(input.username);
  validateUsername(username);
  validatePassword(input.password);
  validateRole(input.role);

  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [randomUUID(), username, hashPassword(input.password), input.role, now, now],
  );

  const created = await queryFirst<UserRow>(
    `
      SELECT id, username, role, created_at, updated_at, disabled_at
      FROM users
      WHERE username = ?
    `,
    [username],
  );

  if (!created) {
    throw new Error("账号创建失败。");
  }

  return rowToUser(created);
}

export async function updateUser(
  id: string,
  input: { username?: string; password?: string; role?: UserRole; disabled?: boolean },
) {
  const current = await getUserRow(id);
  if (!current) {
    throw new Error("账号不存在。");
  }

  const nextUsername = input.username === undefined ? String(current.username) : normalizeUsername(input.username);
  const nextRole = input.role ?? (String(current.role) as UserRole);
  const nextDisabledAt =
    input.disabled === undefined
      ? current.disabled_at
      : input.disabled
        ? current.disabled_at ?? new Date().toISOString()
        : null;

  validateUsername(nextUsername);
  validateRole(nextRole);

  if ((nextRole !== "admin" || nextDisabledAt) && current.role === "admin" && !current.disabled_at) {
    await assertCanRemoveAdmin(id);
  }

  if (input.password !== undefined && input.password !== "") {
    validatePassword(input.password);
  }

  const now = new Date().toISOString();
  await transaction((db) => {
    if (input.password !== undefined && input.password !== "") {
      db.run(
        `
          UPDATE users
          SET username = ?, password_hash = ?, role = ?, disabled_at = ?, updated_at = ?
          WHERE id = ?
        `,
        [nextUsername, hashPassword(input.password), nextRole, nextDisabledAt, now, id],
      );
    } else {
      db.run(
        `
          UPDATE users
          SET username = ?, role = ?, disabled_at = ?, updated_at = ?
          WHERE id = ?
        `,
        [nextUsername, nextRole, nextDisabledAt, now, id],
      );
    }
  });

  const updated = await getUserRow(id);
  if (!updated) {
    throw new Error("账号不存在。");
  }

  return rowToUser(updated);
}

export async function disableUser(id: string) {
  await assertCanRemoveAdmin(id);
  return updateUser(id, { disabled: true });
}
