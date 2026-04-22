import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { AUTH_SECRET, IS_PRODUCTION, SESSION_TTL_MS } from "@/lib/env";
import { execute, queryFirst } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { AuthUser, UserRole } from "@/lib/types";

type SessionUserRow = {
  session_id: string;
  user_id: string;
  username: string;
  role: UserRole;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_seen_at: string;
  expires_at: string;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(`${AUTH_SECRET}:${token}`).digest("hex");
}

function toAuthUser(row: SessionUserRow): AuthUser {
  return {
    id: row.user_id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

export function createSessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax" as const,
      path: "/",
      expires: expiresAt,
    },
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax" as const,
      path: "/",
      expires: new Date(0),
    },
  };
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const now = new Date().toISOString();

  await execute(
    `
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [randomUUID(), userId, hashSessionToken(token), expiresAt.toISOString(), now, now],
  );

  await execute("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?", [now, now, userId]);

  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string) {
  await execute("DELETE FROM sessions WHERE token_hash = ?", [hashSessionToken(token)]);
}

export async function deleteSessionsForUser(userId: string) {
  await execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const row = await queryFirst<SessionUserRow>(
    `
      SELECT
        s.id AS session_id,
        s.expires_at,
        s.last_seen_at,
        u.id AS user_id,
        u.username,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        u.last_login_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `,
    [hashSessionToken(token)],
  );

  if (!row) {
    return null;
  }

  if (row.status !== "active" || new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSessionByToken(token);
    return null;
  }

  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60 * 1000) {
    await execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [
      new Date().toISOString(),
      row.session_id,
    ]);
  }

  return toAuthUser(row);
}

export async function requireApiUser(role?: UserRole | UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new HttpError(401, "请先登录。");
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      throw new HttpError(403, "没有权限执行该操作。");
    }
  }

  return user;
}
