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
    () => tagGroups.filter((group) => group.groupName !== CUSTOM_TAG_GROUP),
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
      setStatus("标签已创建。");
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : "创建标签失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="drawer-group">
      <strong>新建标签</strong>
      <p className="field-note">标签会进入对应分组，创建后可以立即用于模板上传和标签编辑。</p>
      <form className="drawer-inline-form" onSubmit={submit}>
        <input
          className="text-input"
          id="tagCreatorName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="标签名"
          required
        />

        <select
          className="text-input"
          id="tagCreatorGroup"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          required
        >
          <option value="">选择分组</option>
          {groupedOptions.map((group) => (
            <option key={group.groupName} value={group.groupName}>
              {group.groupName}
            </option>
          ))}
        </select>

        <button className="secondary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "创建中..." : "创建标签"}
        </button>
      </form>
      {status ? <div className={`form-status${isError ? " error" : " success"}`}>{status}</div> : null}
    </section>
  );
}
