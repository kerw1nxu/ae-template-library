import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { createManagedTag } from "@/lib/tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { name?: unknown; groupName?: unknown };
    const item = await createManagedTag({
      name: String(body.name ?? ""),
      groupName: String(body.groupName ?? ""),
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "标签创建失败。";
    const status = /标签|分类|UNIQUE|unique/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
