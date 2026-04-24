"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  templateId: string;
};

export function TemplateDeleteButton({ templateId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const deleteTemplate = async () => {
    const confirmed = window.confirm("确定要删除这个模板吗？文件会保留在存储中，列表和下载入口会隐藏。");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "模板删除失败。");
      }
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "模板删除失败。");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="danger-block">
      <button className="danger-button" type="button" disabled={isDeleting} onClick={deleteTemplate}>
        {isDeleting ? "删除中..." : "删除模板"}
      </button>
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}
