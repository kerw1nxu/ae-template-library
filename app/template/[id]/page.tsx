import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateTagSection } from "@/components/template-tag-section";
import { getMediaUrl } from "@/lib/media-url";
import { getTagGroups, getTemplateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, tagGroups] = await Promise.all([getTemplateById(id), getTagGroups()]);

  if (!template) {
    notFound();
  }

  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/">模板库</Link>
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

          <div style={{ marginTop: 22 }}>
            <h2>{template.name}</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
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

        <aside className="panel">
          <h3>标签与操作</h3>

          <TemplateTagSection template={template} tagGroups={tagGroups} />

          <div className="detail-actions">
            <a className="button-link" href={`/api/templates/${template.id}/download`}>
              下载模板
            </a>
            <Link className="button-link secondary" href="/">
              返回列表
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
