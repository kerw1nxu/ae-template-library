"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/components/icons";
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
        throw new Error(payload.error ?? "扫描失败。");
      }

      setResult(payload.result);
      await onScanned();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "扫描失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Scan</p>
            <h2>扫描导入</h2>
            <p>从 SCAN_ROOT 下读取素材目录。每个模板目录会自动匹配首个图片、首个视频和首个模板文件。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="relativePath">扫描路径</label>
            <input
              id="relativePath"
              type="text"
              value={relativePath}
              onChange={(event) => setRelativePath(event.target.value)}
              placeholder="默认 . 表示扫描整个导入根目录"
            />
          </div>

          {error ? <div className="status error">{error}</div> : null}

          {result ? (
            <div className="group-block">
              <h4>扫描结果</h4>
              <div className="scan-summary">
                <span>扫描 {result.scanned}</span>
                <span>新增 {result.created}</span>
                <span>更新 {result.updated}</span>
                <span>跳过 {result.skipped}</span>
              </div>
              {result.issues.length > 0 ? (
                <div className="issue-list">
                  {result.issues.slice(0, 8).map((issue) => (
                    <div className="status error" key={`${issue.relativePath}-${issue.reason}`}>
                      {issue.relativePath}: {issue.reason}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="form-actions">
            <button className="button" type="submit" disabled={isSubmitting}>
              <Icon name="scan" />
              {isSubmitting ? "正在扫描..." : "开始扫描"}
            </button>
            <button className="button secondary" type="button" onClick={onClose}>
              关闭
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
