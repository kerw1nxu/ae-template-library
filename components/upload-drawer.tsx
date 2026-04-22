"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TagCreator } from "@/components/tag-creator";
import { CUSTOM_TAG_GROUP } from "@/lib/constants";
import { mergeTagIntoGroups } from "@/lib/tag-groups";
import type { TagGroup, TagRecord } from "@/lib/types";

type Props = {
  open: boolean;
  tagGroups: TagGroup[];
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
  onTagsChanged?: () => Promise<void> | void;
};

type SubmitState =
  | { kind: "idle"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function UploadDrawer({ open, tagGroups, onClose, onUploaded, onTagsChanged }: Props) {
  const [availableTagGroups, setAvailableTagGroups] = useState(tagGroups);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const systemGroups = useMemo(
    () => availableTagGroups.filter((group) => group.groupName !== CUSTOM_TAG_GROUP),
    [availableTagGroups],
  );

  useEffect(() => {
    setAvailableTagGroups(tagGroups);
  }, [tagGroups]);

  if (!open) {
    return null;
  }

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) =>
      current.includes(tagName)
        ? current.filter((item) => item !== tagName)
        : [...current, tagName],
    );
  };

  const reset = () => {
    setSelectedTags([]);
    setCustomTags("");
    setSubmitState({ kind: "idle", message: "" });
    setAvailableTagGroups(tagGroups);
  };

  const handleTagCreated = async (tag: TagRecord) => {
    setAvailableTagGroups((current) => mergeTagIntoGroups(current, tag));
    setSelectedTags((current) => (current.includes(tag.name) ? current : [...current, tag.name]));
    await onTagsChanged?.();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("systemTags", JSON.stringify(selectedTags));
    formData.set("customTags", customTags);

    setIsSubmitting(true);
    setSubmitState({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "上传失败。");
      }

      setSubmitState({ kind: "success", message: "模板已上传。" });
      form.reset();
      reset();
      await onUploaded();
      onClose();
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "上传失败。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>上传模板</h2>
            <p>管理员上传后，模板会立即进入素材库并可被成员账号访问。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">模板名称</label>
            <input id="name" name="name" type="text" required placeholder="例如：2026 春季发布会片头" />
          </div>

          <div className="field">
            <label htmlFor="description">模板说明</label>
            <textarea
              id="description"
              name="description"
              placeholder="可填写适用场景、配色、插件依赖、替换方式等说明。"
            />
          </div>

          {systemGroups.map((group) => (
            <div className="group-block" key={group.groupName}>
              <h4>{group.groupName}</h4>
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
            </div>
          ))}

          <TagCreator tagGroups={availableTagGroups} onCreated={handleTagCreated} />

          <div className="field">
            <label htmlFor="customTags">自定义标签</label>
            <input
              id="customTags"
              name="customTagsInput"
              type="text"
              value={customTags}
              onChange={(event) => setCustomTags(event.target.value)}
              placeholder="多个标签用空格、逗号或顿号分隔"
            />
          </div>

          <div className="field">
            <label htmlFor="thumbnail">封面图片</label>
            <input id="thumbnail" name="thumbnail" type="file" accept="image/*" required />
            <span className="file-note">支持 JPG、PNG、WEBP、GIF，建议横版封面。</span>
          </div>

          <div className="field">
            <label htmlFor="previewVideo">预览视频</label>
            <input id="previewVideo" name="previewVideo" type="file" accept="video/*" required />
          </div>

          <div className="field">
            <label htmlFor="templateFile">模板源文件</label>
            <input
              id="templateFile"
              name="templateFile"
              type="file"
              accept=".zip,.aep,.aet,.rar,.7z,application/zip,application/octet-stream"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="uploadedBy">上传人</label>
            <input id="uploadedBy" name="uploadedBy" type="text" placeholder="默认会使用当前管理员名称" />
          </div>

          {submitState.message ? (
            <div className={`status ${submitState.kind === "error" ? "error" : "success"}`}>
              {submitState.message}
            </div>
          ) : null}

          <div className="toolbar-actions">
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "上传中..." : "上传模板"}
            </button>
            <button className="button secondary" type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
