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
            <h2>扫描现有模板目录</h2>
            <p>扫描 `SCAN_ROOT` 下的相对目录。每个模板目录里放 1 个图片、1 个视频、1 个模板文件即可，文件名不用固定；如果同类文件有多个，只取第一个。</p>
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
              <div className="status">
                已扫描 {result.scanned} 个目录，新增 {result.created} 个，更新 {result.updated} 个，跳过 {result.skipped} 个。
              </div>
              {result.issues.length > 0 ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {result.issues.slice(0, 8).map((issue) => (
                    <div className="status error" key={`${issue.relativePath}-${issue.reason}`}>
                      {issue.relativePath}：{issue.reason}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12 }}>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "扫描中..." : "开始扫描"}
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
