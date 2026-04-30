"use client";

import { FormEvent, useMemo, useState } from "react";
import { CUSTOM_TAG_GROUP } from "@/lib/constants";
import type { TagGroup, TagRecord } from "@/lib/types";

type Props = {
  tagGroups: TagGroup[];
  onCreated: (tag: TagRecord) => void;
};

export function TagCreator({ tagGroups, onCreated }: Props) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupedOptions = useMemo(
    () => tagGroups.filter((group) => group.groupName !== CUSTOM_TAG_GROUP && group.isEnabled),
    [tagGroups],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    setIsError(false);

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, groupName }),
      });

      const payload = (await response.json()) as { item?: TagRecord; error?: string };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "创建标签失败。");
      }

      onCreated(payload.item);
      setName("");
      setGroupName("");
      setStatus("分组标签已创建，可直接勾选。");
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : "创建标签失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="group-block">
      <h4>新增分组标签</h4>
      <p className="status">管理员可在当前流程中补充标签，创建后会自动加入可选项。</p>
      <form className="form compact-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="tagCreatorName">标签名称</label>
          <input
            id="tagCreatorName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：发布会"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="tagCreatorGroup">所属分类</label>
          <select
            id="tagCreatorGroup"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            required
          >
            <option value="">选择分类</option>
            {groupedOptions.map((group) => (
              <option key={group.groupName} value={group.groupName}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>

        {status ? <div className={`status${isError ? " error" : " success"}`}>{status}</div> : null}

        <button className="button secondary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "正在创建..." : "创建标签"}
        </button>
      </form>
    </section>
  );
}
