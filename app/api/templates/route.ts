import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getErrorMessage, getErrorStatus, invariant } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { createTemplateEntry, searchTemplates, splitCustomTags } from "@/lib/templates";
import { validateTemplateUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readJsonArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const ip = await getRequestIp();
    enforceRateLimit({
      scope: "templates-search",
      identifier: `${user.id}:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

    const query = request.nextUrl.searchParams.get("query") ?? "";
    const tags = (request.nextUrl.searchParams.get("tags") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const items = await searchTemplates({ query, tags });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "模板列表加载失败。") },
      { status: getErrorStatus(error) },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser("admin");
    const ip = await getRequestIp();
    enforceRateLimit({
      scope: "templates-upload",
      identifier: `${user.id}:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const uploadedBy = String(formData.get("uploadedBy") ?? "").trim() || user.username;
    const thumbnail = formData.get("thumbnail");
    const previewVideo = formData.get("previewVideo");
    const templateFile = formData.get("templateFile");
    const systemTags = readJsonArray(formData.get("systemTags"));
    const customTags = splitCustomTags(String(formData.get("customTags") ?? ""));

    invariant(name, 400, "模板名称不能为空。");
    invariant(thumbnail instanceof File && thumbnail.size > 0, 400, "请上传封面图。");
    invariant(previewVideo instanceof File && previewVideo.size > 0, 400, "请上传预览视频。");
    invariant(templateFile instanceof File && templateFile.size > 0, 400, "请上传模板文件。");

    validateTemplateUpload({ thumbnail, previewVideo, templateFile });

    const item = await createTemplateEntry({
      name,
      description,
      uploadedBy,
      systemTags,
      customTags,
      thumbnail,
      previewVideo,
      templateFile,
    });

    await logAuditEvent({
      actorUserId: user.id,
      action: "template.upload",
      targetType: "template",
      targetId: item?.id ?? null,
      details: { name },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "模板上传失败。") },
      { status: getErrorStatus(error) },
    );
  }
}
