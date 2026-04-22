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
      .split(/[、,，\s]+/)
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
        throw new Error(payload.error ?? "标签保存失败。");
      }

      setStatus("标签已更新。");
      router.refresh();
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "标签保存失败。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>编辑标签</h2>
            <p>管理员可以调整系统标签，也可以补充自定义标签。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="form">
          <div>
            <div className="chip-group-label chip-group-space">已选标签</div>
            <div className="tag-row">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <button type="button" className="tag tag-button" key={tag} onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </button>
                ))
              ) : (
                <span className="status">还没有选中标签。</span>
              )}
            </div>
          </div>

          {systemGroups.map((group) => (
            <section key={group.groupName}>
              <div className="chip-group-label chip-group-space">{group.groupName}</div>
              <div className="chip-picker">
                {group.tags.map((tag) => {
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
            <div className="inline-field">
              <input
                id="customTagInput"
                type="text"
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                placeholder="多个标签用空格、逗号或顿号分隔"
              />
              <button type="button" className="button secondary" onClick={addCustomTag}>
                添加
              </button>
            </div>
          </div>

          {status ? (
            <div className={`status${status.includes("失败") ? " error" : " success"}`}>{status}</div>
          ) : null}

          <div className="toolbar-actions">
            <button type="button" className="button" onClick={save} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存标签"}
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
