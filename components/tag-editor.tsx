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

type Status = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function TagEditor({ open, onClose, templateId, initialTags, tagGroups }: Props) {
  const router = useRouter();
  const [availableTagGroups, setAvailableTagGroups] = useState(tagGroups);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [customTagInput, setCustomTagInput] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  const systemGroups = useMemo(
    () =>
      availableTagGroups.filter(
        (group) => group.groupName !== CUSTOM_TAG_GROUP && group.isEnabled,
      ),
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
      .split(/[,，]/)
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
    setStatus({ kind: "idle", message: "" });

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
        throw new Error(payload.error ?? "标签保存失败。");
      }

      setStatus({ kind: "success", message: "标签已保存。" });
      router.refresh();
      onClose();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "标签保存失败。" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Tags</p>
            <h2>编辑标签</h2>
            <p>调整这个模板在列表筛选和详情页中展示的标签。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="form">
          <div>
            <div className="chip-group-label">已选标签</div>
            <div className="tag-row selected-tags-area">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <button type="button" className="tag removable" key={tag} onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </button>
                ))
              ) : (
                <span className="status">暂无标签。</span>
              )}
            </div>
          </div>

          {systemGroups.map((group) => (
            <section className="tag-group-section" key={group.groupName}>
              <div className="chip-group-label">{group.groupName}</div>
              <div className="chip-picker">
                {group.tags.filter((tag) => tag.isEnabled).map((tag) => {
                  const active = selectedTags.includes(tag.name);
                  return (
                    <button
                      type="button"
                      key={`${group.groupName}-${tag.id}`}
                      className={`picker-btn${active ? " active" : ""}`}
                      onClick={() => toggleTag(tag.name)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <TagCreator tagGroups={availableTagGroups} onCreated={handleTagCreated} />

          <div className="field">
            <label htmlFor="customTagInput">自定义标签</label>
            <div className="inline-control">
              <input
                id="customTagInput"
                type="text"
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                placeholder="多个标签用逗号分隔"
              />
              <button type="button" className="button secondary" onClick={addCustomTag}>
                加入
              </button>
            </div>
          </div>

          {status.message ? <div className={`status ${status.kind}`}>{status.message}</div> : null}

          <div className="form-actions">
            <button type="button" className="button" onClick={save} disabled={isSaving}>
              {isSaving ? "正在保存..." : "保存标签"}
            </button>
            <button type="button" className="button secondary" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
