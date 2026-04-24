import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser, getCurrentUser } from "@/lib/auth";
import { createTemplateEntry, searchTemplates, splitCustomTags } from "@/lib/templates";

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
    const viewer = await getCurrentUser();
    const query = request.nextUrl.searchParams.get("query") ?? "";
    const tags = (request.nextUrl.searchParams.get("tags") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const items = await searchTemplates({ query, tags }, viewer);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "模板列表加载失败。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnail = formData.get("thumbnail");
    const previewVideo = formData.get("previewVideo");
    const templateFile = formData.get("templateFile");
    const systemTags = readJsonArray(formData.get("systemTags"));
    const customTags = splitCustomTags(String(formData.get("customTags") ?? ""));

    if (!name) {
      return NextResponse.json({ error: "模板名称不能为空。" }, { status: 400 });
    }

    if (!(thumbnail instanceof File) || thumbnail.size === 0) {
      return NextResponse.json({ error: "请上传封面图。" }, { status: 400 });
    }

    if (!(previewVideo instanceof File) || previewVideo.size === 0) {
      return NextResponse.json({ error: "请上传预览视频。" }, { status: 400 });
    }

    if (!(templateFile instanceof File) || templateFile.size === 0) {
      return NextResponse.json({ error: "请上传模板文件。" }, { status: 400 });
    }

    const item = await createTemplateEntry({
      name,
      description,
      uploadedBy: user.username,
      systemTags,
      customTags,
      thumbnail,
      previewVideo,
      templateFile,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "上传失败。";
    const status = /不能为空|请上传|不支持|过大/.test(message)
      ? 400
      : /非法文件路径|ENOENT|EACCES|EPERM/.test(message)
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
