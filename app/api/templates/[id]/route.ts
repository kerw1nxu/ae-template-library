import { NextResponse } from "next/server";
import { authErrorResponse, getCurrentUser, requireAdmin } from "@/lib/auth";
import { getTemplateById, softDeleteTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return NextResponse.json({ error: "需要登录后继续。" }, { status: 401 });
    }
    const { id } = await context.params;
    const item = await getTemplateById(id, viewer);
    if (!item) {
      return NextResponse.json({ error: "模板不存在。" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "模板详情加载失败。" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    await softDeleteTemplate(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "模板删除失败。";
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
