import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/users";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listUsers();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    return NextResponse.json({ error: "账号列表加载失败。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
    };
    const item = await createUser({
      username: String(body.username ?? ""),
      password: String(body.password ?? ""),
      role: String(body.role ?? "user") as UserRole,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "账号创建失败。";
    const status = /账号|密码|角色|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
