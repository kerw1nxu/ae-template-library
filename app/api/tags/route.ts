import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { createGroupedTag, getTagGroups } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiUser();
    const items = await getTagGroups();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "标签加载失败。") },
      { status: getErrorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser("admin");
    const body = (await request.json()) as { name?: unknown; groupName?: unknown };
    const tag = await createGroupedTag(String(body.name ?? ""), String(body.groupName ?? ""));

    await logAuditEvent({
      actorUserId: user.id,
      action: "tag.create",
      targetType: "tag",
      targetId: String(tag.id),
      details: { name: tag.name, groupName: tag.groupName },
    });

    return NextResponse.json({ item: tag }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "标签创建失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
