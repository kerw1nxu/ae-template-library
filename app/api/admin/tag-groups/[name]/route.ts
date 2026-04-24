import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { updateTagGroup } from "@/lib/tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  try {
    await requireAdmin();
    const { name } = await context.params;
    const body = (await request.json()) as {
      name?: unknown;
      sortOrder?: unknown;
      isEnabled?: unknown;
    };
    const items = await updateTagGroup(decodeURIComponent(name), {
      name: body.name === undefined ? undefined : String(body.name),
      sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
      isEnabled: body.isEnabled === undefined ? undefined : Boolean(body.isEnabled),
    });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "分类更新失败。";
    const status = /分类|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
