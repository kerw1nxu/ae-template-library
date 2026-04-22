import { randomUUID } from "node:crypto";
import { deleteSessionsForUser } from "@/lib/auth";
import { execute, queryAll, queryFirst } from "@/lib/db";
import { HttpError, invariant } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import type { UserRecord, UserRole, UserStatus } from "@/lib/types";

type UserRow = {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function listUsers() {
  const rows = await queryAll<UserRow>(
    `
      SELECT id, username, role, status, created_at, updated_at, last_login_at
      FROM users
      ORDER BY
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        created_at ASC
    `,
  );

  return rows.map(toUserRecord);
}

export async function findUserWithPassword(username: string) {
  return queryFirst<UserRow & { password_hash: string }>(
    `
      SELECT id, username, role, status, created_at, updated_at, last_login_at, password_hash
      FROM users
      WHERE username = ?
    `,
    [username],
  );
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
}) {
  const username = input.username.trim();
  invariant(username, 400, "用户名不能为空。");
  invariant(input.password.trim().length >= 8, 400, "密码至少 8 位。");

  const existing = await queryFirst<{ id: string }>("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) {
    throw new HttpError(409, "用户名已存在。");
  }

  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)
    `,
    [randomUUID(), username, await hashPassword(input.password), input.role, now, now],
  );

  const created = await queryFirst<UserRow>(
    `
      SELECT id, username, role, status, created_at, updated_at, last_login_at
      FROM users
      WHERE username = ?
    `,
    [username],
  );

  invariant(created, 500, "用户创建失败。");
  return toUserRecord(created);
}

async function ensureNotRemovingLastAdmin(userId: string, nextRole?: UserRole, nextStatus?: UserStatus) {
  const current = await queryFirst<{ role: UserRole; status: UserStatus }>(
    "SELECT role, status FROM users WHERE id = ?",
    [userId],
  );

  invariant(current, 404, "用户不存在。");

  const role = nextRole ?? current.role;
  const status = nextStatus ?? current.status;
  const removesAdmin = current.role === "admin" && current.status === "active" && (role !== "admin" || status !== "active");

  if (!removesAdmin) {
    return;
  }

  const activeAdminCount = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'",
  );

  if ((activeAdminCount?.count ?? 0) <= 1) {
    throw new HttpError(400, "至少需要保留一个启用中的管理员账号。");
  }
}

export async function updateUser(input: {
  userId: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
}) {
  const existing = await queryFirst<UserRow>(
    `
      SELECT id, username, role, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = ?
    `,
    [input.userId],
  );

  invariant(existing, 404, "用户不存在。");

  await ensureNotRemovingLastAdmin(input.userId, input.role, input.status);

  const updates: string[] = [];
  const params: Array<string | null> = [];

  if (input.role) {
    updates.push("role = ?");
    params.push(input.role);
  }

  if (input.status) {
    updates.push("status = ?");
    params.push(input.status);
  }

  if (input.password) {
    invariant(input.password.trim().length >= 8, 400, "密码至少 8 位。");
    updates.push("password_hash = ?");
    params.push(await hashPassword(input.password));
  }

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(input.userId);

  await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

  if (input.status === "disabled" || input.password) {
    await deleteSessionsForUser(input.userId);
  }

  const updated = await queryFirst<UserRow>(
    `
      SELECT id, username, role, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = ?
    `,
    [input.userId],
  );

  invariant(updated, 500, "用户更新失败。");
  return toUserRecord(updated);
}
