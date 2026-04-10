import { NextRequest, NextResponse } from "next/server";
import { updateTemplateTags } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { tags?: unknown };
    const tags = Array.isArray(body.tags)
      ? body.tags.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const item = await updateTemplateTags(id, tags);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "标签保存失败。";
    const status = message.includes("不存在") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
