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
        throw new Error(payload.error ?? "上传模板失败。");
      }

      setSubmitState({ kind: "success", message: "模板已上传。" });
      form.reset();
      reset();
      await onUploaded();
      onClose();
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "上传模板失败。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="platform-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <div>
            <span className="section-overline">上传模板</span>
            <h2>补齐信息后直接进入结果页</h2>
            <p>名称、标签、封面、预览视频和源文件会一起写入素材记录。</p>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="name">
            模板名称
          </label>
          <input id="name" className="text-input" name="name" type="text" required />

          <label className="field-label" htmlFor="description">
            模板描述
          </label>
          <textarea
            id="description"
            className="text-area"
            name="description"
            placeholder="补充用途、风格和适用场景，方便结果页搜索。"
          />

          {systemGroups.map((group) => (
            <div className="drawer-group" key={group.groupName}>
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
            </div>
          ))}

          <TagCreator tagGroups={availableTagGroups} onCreated={handleTagCreated} />

          <label className="field-label" htmlFor="customTags">
            自定义标签
          </label>
          <input
            id="customTags"
            className="text-input"
            name="customTagsInput"
            type="text"
            value={customTags}
            onChange={(event) => setCustomTags(event.target.value)}
            placeholder="使用逗号、顿号或空格分隔多个标签"
          />

          <label className="field-label" htmlFor="thumbnail">
            封面图
          </label>
          <input id="thumbnail" className="text-input" name="thumbnail" type="file" accept="image/*" required />

          <label className="field-label" htmlFor="previewVideo">
            预览视频
          </label>
          <input
            id="previewVideo"
            className="text-input"
            name="previewVideo"
            type="file"
            accept="video/*"
            required
          />

          <label className="field-label" htmlFor="templateFile">
            模板源文件
          </label>
          <input
            id="templateFile"
            className="text-input"
            name="templateFile"
            type="file"
            accept=".zip,.aep,.aet,.rar,.7z,application/zip,application/octet-stream"
            required
          />

          <label className="field-label" htmlFor="uploadedBy">
            上传人
          </label>
          <input id="uploadedBy" className="text-input" name="uploadedBy" type="text" />

          {submitState.message ? (
            <div className={`form-status${submitState.kind === "error" ? " error" : " success"}`}>
              {submitState.message}
            </div>
          ) : null}

          <div className="drawer-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "正在上传..." : "提交模板"}
            </button>
            <button className="secondary-button" type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
