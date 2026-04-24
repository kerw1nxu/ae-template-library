"use client";

import { useState } from "react";
import { TagEditor } from "@/components/tag-editor";
import type { TagGroup, TemplateDetail } from "@/lib/types";

type Props = {
  template: TemplateDetail;
  tagGroups: TagGroup[];
  canEdit: boolean;
};

export function TemplateTagSection({ template, tagGroups, canEdit }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
        <div className="chip-group-label" style={{ marginRight: 0 }}>
          当前标签
        </div>
        {canEdit ? (
          <button type="button" className="button secondary" onClick={() => setOpen(true)}>
            编辑
          </button>
        ) : null}
      </div>

      {template.groupedTags.length > 0 ? (
        <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
          {template.groupedTags.map((group) => (
            <section key={group.groupName}>
              <div className="chip-group-label" style={{ marginBottom: 10 }}>
                {group.groupName}
              </div>
              <div className="tag-row">
                {group.tags.map((tag) => (
                  <span className="tag" key={`${group.groupName}-${tag.id}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="status" style={{ marginTop: 14 }}>
          暂无标签。
        </div>
      )}

      {canEdit ? (
        <TagEditor
          open={open}
          onClose={() => setOpen(false)}
          templateId={template.id}
          initialTags={template.tags}
          tagGroups={tagGroups}
        />
      ) : null}
    </>
  );
}
