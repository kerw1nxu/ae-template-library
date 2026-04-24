import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";
import { getMediaAccess } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  try {
    const { slug } = await context.params;
    const relativePath = slug.join("/");
    const viewer = await getCurrentUser();
    const access = await getMediaAccess(relativePath, viewer);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status });
    }

    const file = await readStoredFile(relativePath);

    return new NextResponse(file.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "媒体文件读取失败。";
    const status = /ENOENT|EACCES|EPERM/.test(message) ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
