import type { Route } from "next";
import Link from "next/link";
import { TemplateCard } from "@/components/template-card";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroups, searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [user, templates, tagGroups] = await Promise.all([
    getCurrentUser(),
    searchTemplates(),
    getTagGroups(),
  ]);

  const featuredTemplates = templates.slice(0, 8);
  const featuredGroups = tagGroups.filter((group) => group.tags.length > 0).slice(0, 3);
  const libraryHref = (user ? "/library" : "/login?next=/library") as Route;
  const detailHref = (templateId: string) =>
    (user ? `/template/${templateId}` : "/login?next=/library") as Route;

  return (
    <main className="site-shell">
      <header className="platform-header">
        <div className="platform-header-inner">
          <Link href={"/" as Route} className="platform-brand">
            <span className="platform-brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="platform-brand-text">光帧模板库</span>
          </Link>

          <nav className="platform-nav">
            <Link href={"/" as Route} className="platform-nav-link active">
              首页
            </Link>
            {user ? (
              <Link href={"/library" as Route} className="platform-nav-link">
                素材库
              </Link>
            ) : null}
            {user?.role === "admin" ? (
              <Link href={"/admin/content" as Route} className="platform-nav-link">
                管理
              </Link>
            ) : null}
          </nav>

          <div className="platform-header-tools">
            <Link href={libraryHref} className="header-search-chip">
              输入关键词，找模板
            </Link>
            {user ? (
              <Link href={"/library" as Route} className="header-action-link">
                进入素材库
              </Link>
            ) : (
              <Link href={"/login" as Route} className="header-action-link">
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="home-search-stage">
        <div className="home-search-panel">
          <Link href={libraryHref} className="hero-search-bar">
            <span>输入关键词 / 编号，找模板</span>
            <span className="hero-search-action">开始搜索</span>
          </Link>

          <div className="home-pill-stack">
            {featuredGroups.map((group) => (
              <div key={group.groupName} className="home-pill-row">
                <span className="home-pill-label">{group.groupName}</span>
                {group.tags.slice(0, 6).map((tag) => (
                  <Link key={`${group.groupName}-${tag.id}`} href={libraryHref} className="filter-pill">
                    {tag.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <div>
            <h2>精选模板</h2>
          </div>
          <Link href={libraryHref} className="section-link">
            查看全部模板
          </Link>
        </div>

        <div className="template-grid">
          {featuredTemplates.map((item) => (
            <TemplateCard key={item.id} item={item} href={detailHref(item.id)} compact />
          ))}
        </div>
      </section>
    </main>
  );
}
