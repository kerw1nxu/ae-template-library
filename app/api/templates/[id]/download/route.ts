import path from "node:path";
import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";
import { getTemplateById } from "@/lib/templates";

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
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const item = await getTemplateById(id);
    if (!item) {
      return NextResponse.json({ error: "模板不存在。" }, { status: 404 });
    }

    const file = await readStoredFile(item.templateFilePath);
    const fileName = toDownloadFileName(item.name, item.templateFilePath);

    return new NextResponse(file.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "模板下载失败。";
    const status = /ENOENT|EACCES|EPERM/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
