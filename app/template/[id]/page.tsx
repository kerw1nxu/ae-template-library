import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { TemplateDeleteButton } from "@/components/template-delete-button";
import { TemplateTagSection } from "@/components/template-tag-section";
import { getCurrentUser } from "@/lib/auth";
import { getMediaUrl } from "@/lib/media-url";
import { getTagGroups } from "@/lib/tags";
import { getTemplateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent(`/template/${id}`)}` as never);
  }

  const [template, tagGroups] = await Promise.all([getTemplateById(id, currentUser), getTagGroups()]);

  if (!template) {
    notFound();
  }

  return (
    <main className="site-page detail-page">
      <div className="crumbs">
        <Link href="/">素材库</Link>
        <span>/</span>
        <span>{template.name}</span>
      </div>

      <div className="detail-shell">
        <section className="panel detail-main">
          <video
            className="video-player"
            src={getMediaUrl(template.previewVideoPath)}
            poster={getMediaUrl(template.thumbnailPath)}
            controls
            playsInline
          />

          <div className="detail-title">
            <p className="eyebrow">Template detail</p>
            <h1>{template.name}</h1>
            <p>{template.description || "暂无描述。"}</p>
          </div>

          <div className="meta-list">
            <div className="meta-item">
              <span>上传时间</span>
              {new Date(template.createdAt).toLocaleString("zh-CN", { hour12: false })}
            </div>
            <div className="meta-item">
              <span>上传人</span>
              {template.uploadedBy}
            </div>
            <div className="meta-item">
              <span>导入方式</span>
              {template.importMode === "scan" ? "扫描导入" : "手动上传"}
            </div>
            <div className="meta-item">
              <span>来源路径</span>
              {template.sourcePathKey || "手动上传模板"}
            </div>
          </div>
        </section>

        <aside className="panel detail-side">
          <div>
            <p className="eyebrow">Tags</p>
            <h2>标签与下载</h2>
          </div>

          <TemplateTagSection
            template={template}
            tagGroups={tagGroups}
            canEdit={currentUser.role === "admin"}
          />

          <div className="detail-actions">
            <a className="button-link" href={`/api/templates/${template.id}/download`}>
              <Icon name="download" />
              下载模板包
            </a>
            <Link className="button-link secondary" href="/">
              返回列表
            </Link>
          </div>

          {currentUser.role === "admin" ? <TemplateDeleteButton templateId={template.id} /> : null}
        </aside>
      </div>
    </main>
  );
}
