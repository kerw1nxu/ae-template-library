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
      <div className="panel-head">
        <div>
          <span className="section-overline">标签分组</span>
          <h3>当前标签</h3>
        </div>
        {canEdit ? (
          <button type="button" className="secondary-button" onClick={() => setOpen(true)}>
            编辑标签
          </button>
        ) : null}
      </div>

      {template.groupedTags.length > 0 ? (
        <div className="tag-section-list">
          {template.groupedTags.map((group) => (
            <section key={group.groupName} className="tag-section-item">
              <strong>{group.groupName}</strong>
              <div className="pill-wrap">
                {group.tags.map((tag) => (
                  <span className="filter-pill active" key={`${group.groupName}-${tag.id}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="field-note">当前还没有标签。</div>
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
