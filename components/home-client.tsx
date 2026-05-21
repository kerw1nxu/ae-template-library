"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { ScanDrawer } from "@/components/scan-drawer";
import { TemplateCard } from "@/components/template-card";
import { UploadDrawer } from "@/components/upload-drawer";
import type { CurrentUser, TemplateListItem } from "@/lib/types";

type Props = {
  initialTemplates: TemplateListItem[];
  currentUser: CurrentUser | null;
};

export function HomeClient({ initialTemplates, currentUser }: Props) {
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState(initialTemplates);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (deferredQuery.trim()) {
        params.set("query", deferredQuery.trim());
      }

      const response = await fetch(`/api/templates?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: TemplateListItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "模板列表加载失败。");
      }

      setTemplates(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模板列表加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <main className="site-page">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-title">AE 模板库</span>
        </Link>

        <nav className="topnav" aria-label="主导航">
          <a href="#templates">找模板</a>
          {currentUser ? <button type="button" onClick={() => setIsUploadOpen(true)}>上传</button> : null}
          {currentUser?.role === "admin" ? <Link href="/admin">后台管理</Link> : null}
        </nav>

        <div className="account-area">
          {currentUser ? (
            <>
              <span className="account-pill">{currentUser.username}</span>
              <button className="ghost-button" type="button" onClick={logout}>
                退出
              </button>
            </>
          ) : (
            <Link className="primary-link" href="/login">
              登录
            </Link>
          )}
        </div>
      </header>

      <section className="search-band">
        <div className="search-panel">
          <label className="search-input">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词或模板名称"
            />
          </label>
          <button className="search-button" type="button" onClick={() => void loadTemplates()}>
            搜索
          </button>
        </div>
        {!currentUser ? (
          <p className="public-note">访客可浏览模板列表；登录后可播放预览、查看详情和下载。</p>
        ) : null}
      </section>

      <section className="template-section" id="templates">
        <div className="section-head">
          <div>
            <h1>团队 AE 模板</h1>
            <p>{isLoading ? "正在更新列表..." : `共显示 ${templates.length} 个模板`}</p>
          </div>
          <div className="section-actions">
            {currentUser?.role === "admin" ? (
              <button className="ghost-button" type="button" onClick={() => setIsScanOpen(true)}>
                扫描导入
              </button>
            ) : null}
            {currentUser ? (
              <button className="primary-button" type="button" onClick={() => setIsUploadOpen(true)}>
                上传模板
              </button>
            ) : (
              <Link className="primary-button" href="/login">
                登录后使用
              </Link>
            )}
          </div>
        </div>

        {error ? <div className="empty-state">{error}</div> : null}

        {!error && templates.length === 0 ? (
          <div className="empty-state">{isLoading ? "正在加载模板..." : "没有找到符合条件的模板。"}</div>
        ) : null}

        <div className="template-grid">
          {templates.map((item) => (
            <TemplateCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <UploadDrawer
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={loadTemplates}
      />

      <ScanDrawer
        open={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanned={loadTemplates}
      />
    </main>
  );
}
