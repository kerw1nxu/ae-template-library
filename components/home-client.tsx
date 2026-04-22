"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
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

export function HomeClient({
  initialTemplates,
  initialTagGroups,
  currentUser,
  canManageContent,
  adminMode = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filtersRef = useRef<HTMLDivElement | null>(null);
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
        throw new Error(payload.error ?? "标签加载失败。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "标签加载失败。");
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, selectedTags.join(",")]);

  useEffect(() => {
    void loadTags();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsTouchDevice(window.matchMedia("(hover: none), (pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isTouchDevice && !filtersRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isTouchDevice]);

  useEffect(() => {
    if (openGroup && !visibleTagGroups.some((group) => group.groupName === openGroup)) {
      setOpenGroup(null);
    }
  }, [openGroup, visibleTagGroups]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) =>
      current.includes(tagName)
        ? current.filter((item) => item !== tagName)
        : [...current, tagName],
    );
  };

  const getGroupLabel = (group: TagGroup) => {
    const selectedInGroup = group.tags
      .filter((tag) => selectedTags.includes(tag.name))
      .map((tag) => tag.name);

    return selectedInGroup.length > 0
      ? `${group.groupName}: ${selectedInGroup.join("、")}`
      : group.groupName;
  };

  return (
    <>
      <div className="hero">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <h1>{adminMode ? "后台内容管理" : "模板素材库"}</h1>
            <p>
              {adminMode
                ? `当前登录：${currentUser.username}，你可以上传模板、扫描目录和维护标签。`
                : `当前登录：${currentUser.username}，可浏览、搜索、预览并下载模板。`}
            </p>
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
            placeholder="搜索模板名或标签，例如：片头 / 科技感 / 4K"
          />
        </div>

        {canManageContent ? (
          <div className="toolbar-actions">
            <button className="button secondary" type="button" onClick={() => setIsScanOpen(true)}>
              扫描目录
            </button>
            <button className="button" type="button" onClick={() => setIsUploadOpen(true)}>
              上传模板
            </button>
          </div>
        ) : null}
      </div>

      <div className="filter-bar" ref={filtersRef}>
        <div className="filter-trigger-row">
          {visibleTagGroups.map((group) => {
            const isOpen = group.groupName === openGroup;
            const hasSelection = group.tags.some((tag) => selectedTags.includes(tag.name));

            return (
              <div
                key={group.groupName}
                className="filter-group"
                onMouseEnter={() => {
                  if (!isTouchDevice) {
                    setOpenGroup(group.groupName);
                  }
                }}
                onMouseLeave={() => {
                  if (!isTouchDevice) {
                    setOpenGroup((current) => (current === group.groupName ? null : current));
                  }
                }}
              >
                <button
                  type="button"
                  className={`filter-trigger${isOpen ? " open" : ""}${hasSelection ? " active" : ""}`}
                  aria-expanded={isOpen}
                  onClick={() => {
                    if (isTouchDevice) {
                      setOpenGroup((current) => (current === group.groupName ? null : group.groupName));
                    }
                  }}
                >
                  <span className="filter-trigger-text">{getGroupLabel(group)}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M3.25 5.5 7 9.25l3.75-3.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isOpen ? (
                  <div className="filter-panel">
                    <div className="filter-panel-header">
                      <span>{group.groupName}</span>
                      <span>{group.tags.length} 个标签</span>
                    </div>
                    <div className="filter-option-list">
                      {group.tags.map((tag) => {
                        const active = selectedTags.includes(tag.name);

                        return (
                          <button
                            type="button"
                            key={`${group.groupName}-${tag.id}`}
                            className={`filter-option${active ? " active" : ""}`}
                            onClick={() => toggleTag(tag.name)}
                          >
                            <span>{tag.name}</span>
                            {active ? <span className="filter-option-check">已选</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {error ? <div className="empty">{error}</div> : null}

      {!error && templates.length === 0 ? (
        <div className="empty">{isLoading ? "正在加载模板..." : "没有匹配到模板。"}</div>
      ) : null}

      <div className="grid">
        {templates.map((item) => (
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
