import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSessionByToken, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUser();

  if (token) {
    await deleteSessionByToken(token);
  }

  if (user) {
    await logAuditEvent({
      actorUserId: user.id,
      action: "auth.logout",
      targetType: "user",
      targetId: user.id,
    });
  }

  const response = NextResponse.json({ ok: true });
  const sessionCookie = clearSessionCookie();
  response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
  return response;
}
