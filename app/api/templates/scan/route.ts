import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { scanTemplateLibrary } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser("admin");
    const ip = await getRequestIp();
    enforceRateLimit({
      scope: "templates-scan",
      identifier: `${user.id}:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    const body = (await request.json().catch(() => ({}))) as { relativePath?: string };
    const result = await scanTemplateLibrary(body.relativePath ?? ".");

    await logAuditEvent({
      actorUserId: user.id,
      action: "template.scan",
      targetType: "scan",
      details: {
        relativePath: body.relativePath ?? ".",
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "扫描失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
