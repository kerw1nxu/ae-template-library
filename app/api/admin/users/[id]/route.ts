import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { disableUser, updateUser } from "@/lib/users";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
      disabled?: unknown;
    };
    const item = await updateUser(id, {
      username: body.username === undefined ? undefined : String(body.username),
      password: body.password === undefined ? undefined : String(body.password),
      role: body.role === undefined ? undefined : (String(body.role) as UserRole),
      disabled: body.disabled === undefined ? undefined : Boolean(body.disabled),
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "账号更新失败。";
    const status = /不存在|账号|密码|角色|最后一个|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const item = await disableUser(id);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "账号停用失败。";
    const status = /不存在|最后一个/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
