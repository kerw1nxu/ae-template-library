import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getErrorMessage, getErrorStatus } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  try {
    const user = await requireApiUser();
    const ip = await getRequestIp();
    enforceRateLimit({
      scope: "media-preview",
      identifier: `${user.id}:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

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
    return NextResponse.json(
      { error: getErrorMessage(error, "媒体资源访问失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
