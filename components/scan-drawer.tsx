"use client";

import { FormEvent, useState } from "react";
import type { ScanResult } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onScanned: () => Promise<void> | void;
};

export function ScanDrawer({ open, onClose, onScanned }: Props) {
  const [relativePath, setRelativePath] = useState(".");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/templates/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath }),
      });
      const payload = (await response.json()) as { result?: ScanResult; error?: string };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "扫描目录失败。");
      }

      setResult(payload.result);
      await onScanned();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "扫描目录失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="platform-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <div>
            <span className="section-overline">目录扫描</span>
            <h2>从导入目录补录模板</h2>
            <p>扫描配置好的根目录，自动同步封面、预览视频和源文件。</p>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="relativePath">
            扫描相对路径
          </label>
          <input
            id="relativePath"
            className="text-input"
            type="text"
            value={relativePath}
            onChange={(event) => setRelativePath(event.target.value)}
            placeholder="默认使用 . 表示扫描根目录"
          />

          {error ? <div className="form-status error">{error}</div> : null}

          {result ? (
            <div className="drawer-group">
              <strong>扫描结果</strong>
              <p className="field-note">
                已扫描 {result.scanned} 个目录，新增 {result.created} 条，更新 {result.updated} 条，跳过{" "}
                {result.skipped} 条。
              </p>
              {result.issues.length > 0 ? (
                <div className="issue-stack">
                  {result.issues.slice(0, 8).map((issue) => (
                    <div className="form-status error" key={`${issue.relativePath}-${issue.reason}`}>
                      {issue.relativePath}: {issue.reason}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="drawer-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "正在扫描..." : "开始扫描"}
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
