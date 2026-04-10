import { NextResponse } from "next/server";
import { createGroupedTag, getTagGroups } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getTagGroups();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "标签列表加载失败。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; groupName?: unknown };
    const tag = await createGroupedTag(String(body.name ?? ""), String(body.groupName ?? ""));
    return NextResponse.json({ item: tag }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "标签创建失败。";
    const status = /不能为空|无效|已存在/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
