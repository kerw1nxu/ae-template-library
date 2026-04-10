import { NextResponse } from "next/server";
import { getTemplateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const item = await getTemplateById(id);
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
