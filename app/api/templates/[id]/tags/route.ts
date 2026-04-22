import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { updateTemplateTags } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser("admin");
    const { id } = await context.params;
    const body = (await request.json()) as { tags?: unknown };
    const tags = Array.isArray(body.tags)
      ? body.tags.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const item = await updateTemplateTags(id, tags);

    await logAuditEvent({
      actorUserId: user.id,
      action: "template.tags.update",
      targetType: "template",
      targetId: id,
      details: { tags },
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "标签更新失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
