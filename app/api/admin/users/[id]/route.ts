import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { updateUser } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireApiUser("admin");
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      role?: unknown;
      status?: unknown;
      password?: unknown;
    };

    const item = await updateUser({
      userId: id,
      role: body.role === "admin" || body.role === "member" ? body.role : undefined,
      status: body.status === "active" || body.status === "disabled" ? body.status : undefined,
      password: typeof body.password === "string" && body.password.trim() ? body.password : undefined,
    });

    await logAuditEvent({
      actorUserId: actor.id,
      action: "user.update",
      targetType: "user",
      targetId: item.id,
      details: {
        role: item.role,
        status: item.status,
        passwordReset: typeof body.password === "string" && body.password.trim().length > 0,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "更新用户失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
