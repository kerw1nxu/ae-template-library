import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TemplateDeleteButton } from "@/components/template-delete-button";
import { getCurrentUser } from "@/lib/auth";
import { getMediaUrl } from "@/lib/media-url";
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

  const template = await getTemplateById(id, currentUser);

  if (!template) {
    notFound();
  }

  return (
    <main className="site-page detail-page">
      <div className="crumbs">
        <Link href="/">模板库</Link>
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
            <h2>{template.name}</h2>
            <p>
              {template.description || "暂无补充说明。"}
            </p>
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
              <span>入库方式</span>
              {template.importMode === "scan" ? "扫描导入" : "手工上传"}
            </div>
            <div className="meta-item">
              <span>源目录</span>
              {template.sourcePathKey || "上传模板"}
            </div>
          </div>
        </section>

        <aside className="panel detail-side">
          <h3>模板操作</h3>

          <section style={{ marginTop: 18 }}>
            <div className="chip-group-label" style={{ marginBottom: 10 }}>
              Tags
            </div>
            {template.searchKeywords.length > 0 ? (
              <div className="tag-row">
                {template.searchKeywords.map((keyword) => (
                  <span className="tag" key={`${template.id}-${keyword}`}>
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <div className="status">暂无 tags。</div>
            )}
          </section>

          <div className="detail-actions">
            <a className="button-link" href={`/api/templates/${template.id}/download`}>
              下载模板
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
