import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, createUserSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus, invariant } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { findUserWithPassword } from "@/lib/users";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = await getRequestIp();
    enforceRateLimit({
      scope: "auth-login",
      identifier: ip,
      limit: 10,
      windowMs: 60_000,
    });

    const body = (await request.json().catch(() => ({}))) as {
      username?: unknown;
      password?: unknown;
    };
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    invariant(username, 400, "请输入用户名。");
    invariant(password, 400, "请输入密码。");

    const user = await findUserWithPassword(username);
    invariant(user, 401, "用户名或密码错误。");
    invariant(user.status === "active", 403, "账号已被禁用。");

    const passwordOk = await verifyPassword(password, user.password_hash);
    invariant(passwordOk, 401, "用户名或密码错误。");

    const session = await createUserSession(user.id);
    const response = NextResponse.json({ ok: true });
    const sessionCookie = createSessionCookie(session.token, session.expiresAt);
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);

    await logAuditEvent({
      actorUserId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      details: { username },
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "登录失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
