import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus, invariant } from "@/lib/http";
import { createUser, listUsers } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiUser("admin");
    const items = await listUsers();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "用户列表加载失败。") },
      { status: getErrorStatus(error) },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser("admin");
    const body = (await request.json().catch(() => ({}))) as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
    };
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "member";

    invariant(username, 400, "用户名不能为空。");
    invariant(password, 400, "密码不能为空。");

    const item = await createUser({ username, password, role });

    await logAuditEvent({
      actorUserId: user.id,
      action: "user.create",
      targetType: "user",
      targetId: item.id,
      details: { username: item.username, role: item.role },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "创建用户失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
