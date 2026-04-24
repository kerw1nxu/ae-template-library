import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");
    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登录失败。" },
      { status: 500 },
    );
  }
}
