import path from "node:path";
import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { readStoredFile } from "@/lib/storage";
import { getTemplateById, recordDownloadEvent } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDownloadFileName(templateName: string, storedPath: string) {
  const ext = path.extname(storedPath);
  const safeName = templateName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ");

  return `${safeName || "template"}${ext}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const item = await getTemplateById(id, user);
    if (!item) {
      return NextResponse.json({ error: "模板不存在。" }, { status: 404 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = checkRateLimit({
      key: `download:${user.id}:${ip}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "下载过于频繁，请稍后再试。" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const file = await readStoredFile(item.templateFilePath);
    const fileName = toDownloadFileName(item.name, item.templateFilePath);
    await recordDownloadEvent({
      templateId: item.id,
      userId: user.id,
      ip,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return new NextResponse(file.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "模板下载失败。";
    const status = /ENOENT|EACCES|EPERM/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
