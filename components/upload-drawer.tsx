"use client";

import { FormEvent, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
};

type SubmitState =
  | { kind: "idle"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function UploadDrawer({ open, onClose, onUploaded }: Props) {
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

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

      setSubmitState({ kind: "success", message: "模板已自动导入。" });
      form.reset();
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
            <h2>自动导入模板</h2>
            <p>上传带 VJshi 编号的模板压缩包，后台会自动抓取标题、封面、预览视频和搜索关键词。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="templateFile">模板压缩包</label>
            <input
              id="templateFile"
              name="templateFile"
              type="file"
              accept=".zip,.rar,.7z,.aep,.aet,application/zip,application/octet-stream"
              required
            />
            <span className="file-note">文件名需包含 VJshi 编号，例如：光厂_9958739_片头.zip。</span>
          </div>

          {submitState.message ? (
            <div className={`status ${submitState.kind === "error" ? "error" : "success"}`}>
              {submitState.message}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12 }}>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "自动导入中..." : "上传并自动导入"}
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
