import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_SECURE } from "@/lib/env";
import { execute, queryFirst, transaction } from "@/lib/db";
import type { CurrentUser, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "ae_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type UserRow = {
  id: string;
  username: string;
  role: UserRole;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须设置长度至少 32 位的 AUTH_SECRET。");
  }

  return "development-only-auth-secret-do-not-use-in-production";
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, saltValue, keyValue] = storedHash.split("$");
  if (scheme !== "scrypt" || !saltValue || !keyValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64");
  const storedKey = Buffer.from(keyValue, "base64");
  const candidateKey = scryptSync(password, salt, storedKey.length);

  return candidateKey.length === storedKey.length && timingSafeEqual(candidateKey, storedKey);
}

export async function authenticateUser(username: string, password: string) {
  const row = await queryFirst<UserRow & { password_hash: string }>(
    `
      SELECT id, username, role, password_hash
      FROM users
      WHERE username = ?
        AND disabled_at IS NULL
    `,
    [username.trim()],
  );

  if (!row || !verifyPassword(password, String(row.password_hash))) {
    return null;
  }

  return {
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) as UserRole,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  await transaction((db) => {
    db.run("DELETE FROM sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL", [now.toISOString()]);
    db.run(
      `
        INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [randomUUID(), hashSessionToken(token), userId, now.toISOString(), expiresAt.toISOString()],
    );
  });

  return {
    token,
    expiresAt,
  };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function revokeSessionToken(token: string | undefined) {
  if (!token) {
    return;
  }

  await execute("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?", [
    new Date().toISOString(),
    hashSessionToken(token),
  ]);
}

export async function getUserBySessionToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) {
    return null;
  }

  const row = await queryFirst<UserRow>(
    `
      SELECT users.id, users.username, users.role
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.revoked_at IS NULL
        AND sessions.expires_at > ?
        AND users.disabled_at IS NULL
    `,
    [hashSessionToken(token), new Date().toISOString()],
  );

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) as UserRole,
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("需要登录后继续。");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("需要管理员权限。");
  }

  return user;
}

export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "没有权限。";
  const status = message.includes("登录") ? 401 : 403;
  return NextResponse.json({ error: message }, { status });
}
