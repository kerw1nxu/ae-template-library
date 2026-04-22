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

  const metaItems = [
    { label: "上传时间", value: new Date(template.createdAt).toLocaleString("zh-CN", { hour12: false }) },
    { label: "上传人", value: template.uploadedBy },
    { label: "导入方式", value: template.importMode === "scan" ? "目录扫描" : "手动上传" },
    { label: "来源路径", value: template.sourcePathKey ?? "手动上传素材" },
  ];

  return (
    <main className="site-shell">
      <AppHeader user={user} active="detail" />

      <div className="page-shell">
        <div className="breadcrumbs">
          <Link href={"/library" as Route}>素材库</Link>
          <span>/</span>
          <span>{template.name}</span>
        </div>

        <div className="detail-layout">
          <section className="detail-main-card">
            <div className="detail-player">
              <video
                className="video-player"
                src={getMediaUrl(template.previewVideoPath)}
                poster={getMediaUrl(template.thumbnailPath)}
                controls
                playsInline
              />
            </div>

            <div className="detail-summary">
              <span className="section-overline">模板详情</span>
              <h1>{template.name}</h1>
              <p>
                {template.description.trim() || "当前模板还没有补充描述，可先通过预览视频和标签判断是否符合项目需求。"}
              </p>
            </div>

            <div className="detail-meta-list">
              {metaItems.map((item) => (
                <article key={item.label} className="detail-meta-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <aside className="detail-side-card">
            <div className="detail-side-head">
              <span className="section-overline">下载与标签</span>
              <h2>素材信息</h2>
              <p>先确认标签、导入方式和预览内容，再下载源文件进入项目。</p>
            </div>

            <TemplateTagSection
              template={template}
              tagGroups={tagGroups}
              canEdit={user.role === "admin"}
            />

            <div className="detail-action-row">
              <a className="primary-button" href={`/api/templates/${template.id}/download`}>
                下载源文件
              </a>
              <Link className="secondary-button" href={"/library" as Route}>
                返回素材库
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
