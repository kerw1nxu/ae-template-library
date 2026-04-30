"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ScanDrawer } from "@/components/scan-drawer";
import { TemplateCard } from "@/components/template-card";
import { UploadDrawer } from "@/components/upload-drawer";
import type { CurrentUser, TagGroup, TemplateListItem } from "@/lib/types";

type Props = {
  initialTemplates: TemplateListItem[];
  initialTagGroups: TagGroup[];
  currentUser: CurrentUser | null;
};

export function HomeClient({ initialTemplates, initialTagGroups, currentUser }: Props) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  const visibleGroups = useMemo(
    () => tagGroups.filter((group) => group.isEnabled && group.tags.some((tag) => tag.isEnabled)),
    [tagGroups],
  );

  const loadTemplates = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (deferredQuery.trim()) {
        params.set("query", deferredQuery.trim());
      }
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
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

  const loadTags = async () => {
    try {
      const response = await fetch("/api/tags", { cache: "no-store" });
      const payload = (await response.json()) as { items?: TagGroup[] };
      if (response.ok && payload.items) {
        setTagGroups(payload.items);
      }
    } catch {
      // Keep the current tag list if refresh fails.
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, selectedTags.join(",")]);

  useEffect(() => {
    void loadTags();
  }, []);

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) =>
      current.includes(tagName)
        ? current.filter((item) => item !== tagName)
        : [...current, tagName],
    );
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <main className="site-page">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-title">AE 模板素材库</span>
        </Link>

        <nav className="topnav" aria-label="主导航">
          <a href="#templates">模板</a>
          <a href="#categories">分类</a>
          {currentUser ? (
            <button type="button" onClick={() => setIsUploadOpen(true)}>
              <Icon name="upload" />
              上传
            </button>
          ) : null}
          {currentUser?.role === "admin" ? <Link href="/admin">后台</Link> : null}
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

      <section className="workbench-summary" aria-label="素材库状态">
        <div>
          <span>当前结果</span>
          <strong>{templates.length}</strong>
        </div>
        <div>
          <span>分类组</span>
          <strong>{visibleGroups.length}</strong>
        </div>
        <div>
          <span>访问状态</span>
          <strong>{currentUser ? "已登录" : "访客"}</strong>
        </div>
      </section>

      <section className="search-band" aria-label="模板搜索">
        <div className="search-panel">
          <label className="search-input">
            <Icon name="search" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索模板名称、关键词或标签"
            />
          </label>
          <button className="search-button" type="button" onClick={() => void loadTemplates()}>
            <Icon name="search" />
            搜索
          </button>
        </div>
        {!currentUser ? (
          <p className="public-note">当前为访客模式。登录后可打开详情页、预览视频并下载模板包。</p>
        ) : null}
      </section>

      <section className="category-strip" id="categories" aria-label="分类筛选">
        {visibleGroups.map((group) => (
          <div className="category-menu" key={group.groupName}>
            <button type="button" className="category-trigger">
              {group.groupName}
              <span aria-hidden="true">▾</span>
            </button>
            <div className="category-dropdown">
              {group.tags
                .filter((tag) => tag.isEnabled)
                .map((tag) => {
                  const active = selectedTags.includes(tag.name);
                  return (
                    <button
                      type="button"
                      key={`${group.groupName}-${tag.id}`}
                      className={`filter-chip${active ? " active" : ""}`}
                      onClick={() => toggleTag(tag.name)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
        {selectedTags.length > 0 ? (
          <button className="reset-filter" type="button" onClick={() => setSelectedTags([])}>
            清除筛选
          </button>
        ) : null}
      </section>

      {selectedTags.length > 0 ? (
        <div className="selected-row">
          {selectedTags.map((tag) => (
            <button type="button" key={tag} className="selected-tag" onClick={() => toggleTag(tag)}>
              {tag} ×
            </button>
          ))}
        </div>
      ) : null}

      <section className="template-section" id="templates">
        <div className="section-head">
          <div>
            <p className="eyebrow">Library</p>
            <h1>模板库</h1>
            <p>{isLoading ? "正在更新列表..." : `共 ${templates.length} 个模板`}</p>
          </div>
          <div className="section-actions">
            {currentUser?.role === "admin" ? (
              <button className="ghost-button" type="button" onClick={() => setIsScanOpen(true)}>
                <Icon name="scan" />
                扫描导入
              </button>
            ) : null}
            {currentUser ? (
              <button className="primary-button" type="button" onClick={() => setIsUploadOpen(true)}>
                <Icon name="upload" />
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
          <div className="empty-state">{isLoading ? "正在加载模板..." : "没有找到匹配的模板。"}</div>
        ) : null}

        <div className="template-grid">
          {templates.map((item) => (
            <TemplateCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <UploadDrawer
        open={isUploadOpen}
        tagGroups={tagGroups}
        canManageTags={currentUser?.role === "admin"}
        onClose={() => setIsUploadOpen(false)}
        onTagsChanged={loadTags}
        onUploaded={async () => {
          await Promise.all([loadTemplates(), loadTags()]);
        }}
      />

      <ScanDrawer
        open={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanned={async () => {
          await Promise.all([loadTemplates(), loadTags()]);
        }}
      />
    </main>
  );
}
