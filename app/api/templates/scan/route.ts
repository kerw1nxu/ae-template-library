import { NextRequest, NextResponse } from "next/server";
import { scanTemplateLibrary } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { relativePath?: string };
    const result = await scanTemplateLibrary(body.relativePath ?? ".");
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "扫描失败。";
    const status = /非法文件路径|ENOENT|EACCES|EPERM/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
