import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { getTemplateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiUser();
    const { id } = await context.params;
    const item = await getTemplateById(id);
    if (!item) {
      return NextResponse.json({ error: "模板不存在。" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "模板详情加载失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
