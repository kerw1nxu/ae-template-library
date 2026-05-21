import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser, getCurrentUser } from "@/lib/auth";
import { createTemplateEntry, searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const viewer = await getCurrentUser();
    const query = request.nextUrl.searchParams.get("query") ?? "";

    const items = await searchTemplates({ query }, viewer);
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
    const templateFile = formData.get("templateFile");

    if (!(templateFile instanceof File) || templateFile.size === 0) {
      return NextResponse.json({ error: "请上传模板压缩包。" }, { status: 400 });
    }

    const item = await createTemplateEntry({
      uploadedBy: user.username,
      templateFile,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /登录|管理员权限/.test(error.message)) {
      return authErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "上传失败。";
    const status = /不能为空|请上传|不支持|过大|没有找到|没有解析到|已入库|校验未通过|下载失败/.test(message)
      ? 400
      : /非法文件路径|ENOENT|EACCES|EPERM/.test(message)
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
