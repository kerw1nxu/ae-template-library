"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { ScanDrawer } from "@/components/scan-drawer";
import { TemplateCard } from "@/components/template-card";
import { UploadDrawer } from "@/components/upload-drawer";
import type { TagGroup, TemplateListItem } from "@/lib/types";

type Props = {
  initialTemplates: TemplateListItem[];
  initialTagGroups: TagGroup[];
};

export function HomeClient({ initialTemplates, initialTagGroups }: Props) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
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
      // keep initial state
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

  return (
    <>
      <div className="hero">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <h1>AE 模板库</h1>
            <p>局域网内统一搜索、预览、下载和管理团队模板。</p>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M8.75 2.5a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5Zm0 0 7.5 7.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模板名称或标签，例如：年会 / 科技 / 4K"
          />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="button secondary" type="button" onClick={() => setIsScanOpen(true)}>
            扫描目录
          </button>
          <button className="button" type="button" onClick={() => setIsUploadOpen(true)}>
            上传模板
          </button>
        </div>
      </div>

      <div className="filters">
        {tagGroups
          .filter((group) => group.tags.length > 0)
          .map((group) => (
            <div key={group.groupName} className="filters">
              <span className="chip-group-label">{group.groupName}</span>
              {group.tags.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <button
                    type="button"
                    key={`${group.groupName}-${tag.id}`}
                    className={`chip${active ? " active" : ""}`}
                    onClick={() => toggleTag(tag.name)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          ))}
      </div>

      {error ? <div className="empty">{error}</div> : null}

      {!error && templates.length === 0 ? (
        <div className="empty">{isLoading ? "正在加载模板..." : "没有找到符合条件的模板。"}</div>
      ) : null}

      <div className="grid">
        {templates.map((item) => (
          <TemplateCard key={item.id} item={item} />
        ))}
      </div>

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
  );
}
