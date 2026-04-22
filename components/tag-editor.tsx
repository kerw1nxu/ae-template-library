"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TagCreator } from "@/components/tag-creator";
import { CUSTOM_TAG_GROUP } from "@/lib/constants";
import { mergeTagIntoGroups } from "@/lib/tag-groups";
import type { TagGroup, TagRecord } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  templateId: string;
  initialTags: string[];
  tagGroups: TagGroup[];
};

export function TagEditor({ open, onClose, templateId, initialTags, tagGroups }: Props) {
  const router = useRouter();
  const [availableTagGroups, setAvailableTagGroups] = useState(tagGroups);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [customTagInput, setCustomTagInput] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const systemGroups = useMemo(
    () => availableTagGroups.filter((group) => group.groupName !== CUSTOM_TAG_GROUP),
    [availableTagGroups],
  );

  useEffect(() => {
    setAvailableTagGroups(tagGroups);
  }, [tagGroups]);

  useEffect(() => {
    setSelectedTags(initialTags);
  }, [initialTags]);

  if (!open) {
    return null;
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const addCustomTag = () => {
    const newTags = customTagInput
      .split(/[,\s，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (newTags.length === 0) {
      return;
    }

    setSelectedTags((current) => Array.from(new Set([...current, ...newTags])));
    setCustomTagInput("");
  };

  const handleTagCreated = (tag: TagRecord) => {
    setAvailableTagGroups((current) => mergeTagIntoGroups(current, tag));
    setSelectedTags((current) => (current.includes(tag.name) ? current : [...current, tag.name]));
  };

  const save = async () => {
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/templates/${templateId}/tags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: selectedTags }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "保存标签失败。");
      }

      setStatus("标签已更新。");
      router.refresh();
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存标签失败。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="platform-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <div>
            <span className="section-overline">编辑标签</span>
            <h2>维护模板标签</h2>
            <p>可以切换系统标签，也可以补充自定义标签，保存后立即刷新详情页。</p>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="drawer-form">
          <div className="drawer-group">
            <strong>已选标签</strong>
            <div className="pill-wrap">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <button type="button" className="filter-pill active" key={tag} onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </button>
                ))
              ) : (
                <span className="field-note">还没有选中标签。</span>
              )}
            </div>
          </div>

          {systemGroups.map((group) => (
            <section key={group.groupName} className="drawer-group">
              <strong>{group.groupName}</strong>
              <div className="pill-wrap">
                {group.tags.map((tag) => (
                  <button
                    key={`${group.groupName}-${tag.id}`}
                    type="button"
                    className={`filter-pill${selectedTags.includes(tag.name) ? " active" : ""}`}
                    onClick={() => toggleTag(tag.name)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <TagCreator tagGroups={availableTagGroups} onCreated={handleTagCreated} />

          <label className="field-label" htmlFor="customTagInput">
            自定义标签
          </label>
          <div className="drawer-inline-form">
            <input
              id="customTagInput"
              className="text-input"
              type="text"
              value={customTagInput}
              onChange={(event) => setCustomTagInput(event.target.value)}
              placeholder="用逗号、顿号或空格分隔多个标签"
            />
            <button type="button" className="secondary-button" onClick={addCustomTag}>
              添加
            </button>
          </div>

          {status ? <div className={`form-status${status.includes("失败") ? " error" : " success"}`}>{status}</div> : null}

          <div className="drawer-actions">
            <button type="button" className="primary-button" onClick={save} disabled={isSaving}>
              {isSaving ? "正在保存..." : "保存标签"}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
