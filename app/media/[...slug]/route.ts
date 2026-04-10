import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  try {
    const { slug } = await context.params;
    const relativePath = slug.join("/");
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
