import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TemplateTagSection } from "@/components/template-tag-section";
import { getCurrentUser } from "@/lib/auth";
import { getMediaUrl } from "@/lib/media-url";
import { getTagGroups, getTemplateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const { id } = await params;
    redirect(`/login?next=/template/${id}` as Route);
  }

  const { id } = await params;
  const [template, tagGroups] = await Promise.all([
    getTemplateById(id),
    user.role === "admin" ? getTagGroups() : Promise.resolve([]),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <main className="shell">
      <AppHeader user={user} />

      <div className="crumbs">
        <Link href={"/library" as Route}>素材库</Link>
        <span>/</span>
        <span>{template.name}</span>
      </div>

      <div className="detail-shell">
        <section className="panel">
          <video
            className="video-player"
            src={getMediaUrl(template.previewVideoPath)}
            poster={getMediaUrl(template.thumbnailPath)}
            controls
            playsInline
          />

          <div className="stack-lg">
            <h2>{template.name}</h2>
            <p className="muted detail-copy">{template.description || "当前模板还没有补充描述。"}</p>
          </div>

          <div className="meta-list">
            <div className="meta-item">
              <span>创建时间</span>
              {new Date(template.createdAt).toLocaleString("zh-CN", { hour12: false })}
            </div>
            <div className="meta-item">
              <span>上传人</span>
              {template.uploadedBy}
            </div>
            <div className="meta-item">
              <span>导入方式</span>
              {template.importMode === "scan" ? "扫描导入" : "后台上传"}
            </div>
            <div className="meta-item">
              <span>来源路径</span>
              {template.sourcePathKey ?? "后台上传"}
            </div>
          </div>
        </section>

        <aside className="panel">
          <h3>标签信息</h3>

          <TemplateTagSection
            template={template}
            tagGroups={tagGroups}
            canEdit={user.role === "admin"}
          />

          <div className="detail-actions">
            <a className="button-link" href={`/api/templates/${template.id}/download`}>
              下载模板
            </a>
            <Link className="button-link secondary" href={"/library" as Route}>
              返回列表
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
