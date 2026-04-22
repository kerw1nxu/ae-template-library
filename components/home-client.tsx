"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ScanDrawer } from "@/components/scan-drawer";
import { TemplateCard } from "@/components/template-card";
import { UploadDrawer } from "@/components/upload-drawer";
import type { AuthUser, TagGroup, TemplateListItem } from "@/lib/types";

type Props = {
  initialTemplates: TemplateListItem[];
  initialTagGroups: TagGroup[];
  currentUser: AuthUser;
  canManageContent: boolean;
  adminMode?: boolean;
};

type SurfaceTab = "all" | "recent" | "described";
type SortMode = "latest" | "name";

export function HomeClient({
  initialTemplates,
  initialTagGroups,
  canManageContent,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [surfaceTab, setSurfaceTab] = useState<SurfaceTab>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const deferredQuery = useDeferredValue(query);
  const visibleTagGroups = tagGroups.filter((group) => group.tags.length > 0);

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
      const payload = (await response.json()) as { items?: TagGroup[]; error?: string };
      if (response.ok && payload.items) {
        setTagGroups(payload.items);
      } else if (!response.ok) {
        throw new Error(payload.error ?? "标签列表加载失败。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "标签列表加载失败。");
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

  const clearGroupTags = (group: TagGroup) => {
    setSelectedTags((current) => current.filter((tag) => !group.tags.some((item) => item.name === tag)));
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedTags([]);
    setSurfaceTab("all");
    setSortMode("latest");
  };

  const displayTemplates = useMemo(() => {
    let nextItems = [...templates];

    if (surfaceTab === "recent") {
      nextItems = nextItems
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 12);
    } else if (surfaceTab === "described") {
      nextItems = nextItems.filter((item) => item.description.trim().length > 0);
    }

    if (sortMode === "name") {
      nextItems.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
    } else {
      nextItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    return nextItems;
  }, [sortMode, surfaceTab, templates]);

  return (
    <>
      <section className="search-stage">
        <div className="search-stage-panel compact">
          <div className="stage-search-bar">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词、编号或标签，例如：片头 / 科技 / 4K"
            />
            <button type="button" className="stage-search-button">
              搜索
            </button>
          </div>

          <div className="surface-tab-row">
            <button
              type="button"
              className={`surface-tab${surfaceTab === "all" ? " active" : ""}`}
              onClick={() => setSurfaceTab("all")}
            >
              全部素材
            </button>
            <button
              type="button"
              className={`surface-tab${surfaceTab === "recent" ? " active" : ""}`}
              onClick={() => setSurfaceTab("recent")}
            >
              最近上传
            </button>
            <button
              type="button"
              className={`surface-tab${surfaceTab === "described" ? " active" : ""}`}
              onClick={() => setSurfaceTab("described")}
            >
              已补描述
            </button>
          </div>
        </div>
      </section>

      <section className="filter-surface">
        <div className="filter-toolbar">
          <div className="filter-menu-row">
            {visibleTagGroups.map((group) => {
              const isGroupActive = group.tags.some((tag) => selectedTags.includes(tag.name));

              return (
                <div key={group.groupName} className="filter-menu">
                  <button type="button" className={`filter-menu-trigger${isGroupActive ? " active" : ""}`}>
                    <span>{group.groupName}</span>
                    <span className="filter-menu-arrow">⌄</span>
                  </button>

                  <div className="filter-menu-dropdown">
                    <button
                      type="button"
                      className={`filter-menu-option${isGroupActive ? "" : " active"}`}
                      onClick={() => clearGroupTags(group)}
                    >
                      全部{group.groupName}
                    </button>
                    {group.tags.map((tag) => (
                      <button
                        key={`${group.groupName}-${tag.id}`}
                        type="button"
                        className={`filter-menu-option${selectedTags.includes(tag.name) ? " active" : ""}`}
                        onClick={() => toggleTag(tag.name)}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="filter-toolbar-actions">
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="latest">默认排序</option>
              <option value="name">按名称</option>
            </select>
            <button type="button" className="attribute-pill" onClick={resetFilters}>
              条件重置
            </button>
            {canManageContent ? (
              <>
                <button type="button" className="attribute-pill" onClick={() => setIsScanOpen(true)}>
                  扫描目录
                </button>
                <button type="button" className="attribute-pill active" onClick={() => setIsUploadOpen(true)}>
                  上传素材
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <div className="empty-state">{error}</div> : null}

      {!error && displayTemplates.length === 0 ? (
        <div className="empty-state">
          {isLoading ? "正在加载模板列表..." : "没有匹配结果，请调整关键词或标签条件。"}
        </div>
      ) : null}

      <div className="template-grid">
        {displayTemplates.map((item) => (
          <TemplateCard key={item.id} item={item} />
        ))}
      </div>

      {canManageContent ? (
        <>
          <UploadDrawer
            open={isUploadOpen}
            tagGroups={tagGroups}
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
        </>
      ) : null}
    </>
  );
}
