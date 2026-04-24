import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { updateManagedTag } from "@/lib/tags";

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
      name?: unknown;
      groupName?: unknown;
      sortOrder?: unknown;
      isEnabled?: unknown;
    };
    const item = await updateManagedTag(Number(id), {
      name: body.name === undefined ? undefined : String(body.name),
      groupName: body.groupName === undefined ? undefined : String(body.groupName),
      sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
      isEnabled: body.isEnabled === undefined ? undefined : Boolean(body.isEnabled),
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "标签更新失败。";
    const status = /标签|分类|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
