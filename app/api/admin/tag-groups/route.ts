import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { createTagGroup, getTagGroups } from "@/lib/tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const items = await getTagGroups({ includeDisabled: true });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    return NextResponse.json({ error: "分类列表加载失败。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { name?: unknown };
    const items = await createTagGroup(String(body.name ?? ""));
    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "分类创建失败。";
    const status = /分类|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
