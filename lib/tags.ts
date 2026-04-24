import { CUSTOM_TAG_GROUP } from "@/lib/constants";
import { execute, queryAll, queryFirst, transaction } from "@/lib/db";
import type { TagGroup, TagRecord } from "@/lib/types";

type TagGroupOptions = {
  includeDisabled?: boolean;
};

type TagRow = {
  id: number;
  name: string;
  group_name: string;
  is_system: number;
  is_enabled: number;
  sort_order: number;
};

type TagGroupRow = {
  name: string;
  sort_order: number;
  is_enabled: number;
};

function normalizeName(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label}不能为空。`);
  }
  return normalized;
}

function rowToTag(row: TagRow): TagRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    groupName: String(row.group_name),
    isSystem: Boolean(row.is_system),
    isEnabled: Boolean(row.is_enabled),
    sortOrder: Number(row.sort_order),
  };
}

async function getTagRows(options: TagGroupOptions = {}) {
  return queryAll<TagRow>(
    `
      SELECT tags.id, tags.name, tags.group_name, tags.is_system, tags.is_enabled, tags.sort_order
      FROM tags
      JOIN tag_groups ON tag_groups.name = tags.group_name
      WHERE (? = 1 OR (tags.is_enabled = 1 AND tag_groups.is_enabled = 1))
      ORDER BY
        tag_groups.sort_order ASC,
        CASE WHEN tags.group_name = ? THEN 1 ELSE 0 END,
        tags.group_name COLLATE NOCASE ASC,
        tags.sort_order ASC,
        tags.name COLLATE NOCASE ASC
    `,
    [options.includeDisabled ? 1 : 0, CUSTOM_TAG_GROUP],
  );
}

export async function getTagGroups(options: TagGroupOptions = {}): Promise<TagGroup[]> {
  const [groupRows, tagRows] = await Promise.all([
    queryAll<TagGroupRow>(
      `
        SELECT name, sort_order, is_enabled
        FROM tag_groups
        WHERE (? = 1 OR is_enabled = 1)
        ORDER BY sort_order ASC, name COLLATE NOCASE ASC
      `,
      [options.includeDisabled ? 1 : 0],
    ),
    getTagRows(options),
  ]);

  const grouped = new Map<string, TagGroup>();
  for (const row of groupRows) {
    grouped.set(String(row.name), {
      groupName: String(row.name),
      isEnabled: Boolean(row.is_enabled),
      sortOrder: Number(row.sort_order),
      tags: [],
    });
  }

  for (const row of tagRows) {
    const tag = rowToTag(row);
    const bucket = grouped.get(tag.groupName);
    if (bucket) {
      bucket.tags.push(tag);
    }
  }

  return Array.from(grouped.values());
}

export async function resolveTagIds(tagNames: string[]) {
  const uniqueNames = Array.from(new Set(tagNames.map((item) => item.trim()).filter(Boolean)));
  const tagIds = new Set<number>();
  const now = new Date().toISOString();

  for (const tagName of uniqueNames) {
    const existing = await queryFirst<{ id: number }>(
      "SELECT id FROM tags WHERE name = ?",
      [tagName],
    );
    if (existing) {
      tagIds.add(Number(existing.id));
      continue;
    }

    await execute(
      `
        INSERT INTO tags (name, group_name, is_system, is_enabled, sort_order, created_at, updated_at)
        VALUES (?, ?, 0, 1, 999, ?, ?)
      `,
      [tagName, CUSTOM_TAG_GROUP, now, now],
    );
    const created = await queryFirst<{ id: number }>("SELECT id FROM tags WHERE name = ?", [tagName]);
    if (created) {
      tagIds.add(Number(created.id));
    }
  }

  return Array.from(tagIds);
}

export async function createGroupedTag(name: string, groupName: string): Promise<TagRecord> {
  const normalizedName = normalizeName(name, "标签名称");
  const normalizedGroup = normalizeName(groupName, "标签分类");
  const group = await queryFirst<{ name: string; is_enabled: number }>(
    "SELECT name, is_enabled FROM tag_groups WHERE name = ?",
    [normalizedGroup],
  );

  if (!group || !Number(group.is_enabled)) {
    throw new Error("标签分类无效。");
  }

  const existing = await queryFirst<TagRow>(
    `
      SELECT id, name, group_name, is_system, is_enabled, sort_order
      FROM tags
      WHERE name = ?
    `,
    [normalizedName],
  );
  if (existing) {
    if (String(existing.group_name) !== normalizedGroup) {
      throw new Error("同名标签已存在于其他分类中。");
    }
    return rowToTag(existing);
  }

  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO tags (name, group_name, is_system, is_enabled, sort_order, created_at, updated_at)
      VALUES (?, ?, 0, 1, 999, ?, ?)
    `,
    [normalizedName, normalizedGroup, now, now],
  );

  const created = await queryFirst<TagRow>(
    `
      SELECT id, name, group_name, is_system, is_enabled, sort_order
      FROM tags
      WHERE name = ?
    `,
    [normalizedName],
  );
  if (!created) {
    throw new Error("标签创建失败。");
  }

  return rowToTag(created);
}

export async function createTagGroup(name: string) {
  const normalized = normalizeName(name, "分类名称");
  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO tag_groups (name, sort_order, is_enabled, created_at, updated_at)
      VALUES (?, 999, 1, ?, ?)
    `,
    [normalized, now, now],
  );
  return getTagGroups({ includeDisabled: true });
}

export async function updateTagGroup(
  groupName: string,
  input: { name?: string; sortOrder?: number; isEnabled?: boolean },
) {
  const current = await queryFirst<TagGroupRow>(
    "SELECT name, sort_order, is_enabled FROM tag_groups WHERE name = ?",
    [groupName],
  );
  if (!current) {
    throw new Error("分类不存在。");
  }

  const nextName = input.name === undefined ? String(current.name) : normalizeName(input.name, "分类名称");
  const nextSortOrder = input.sortOrder === undefined ? Number(current.sort_order) : Number(input.sortOrder);
  const nextEnabled = input.isEnabled === undefined ? Number(current.is_enabled) : input.isEnabled ? 1 : 0;
  const now = new Date().toISOString();

  await transaction((db) => {
    db.run(
      `
        UPDATE tag_groups
        SET name = ?, sort_order = ?, is_enabled = ?, updated_at = ?
        WHERE name = ?
      `,
      [nextName, nextSortOrder, nextEnabled, now, groupName],
    );
    db.run(
      `
        UPDATE tags
        SET group_name = ?, updated_at = ?
        WHERE group_name = ?
      `,
      [nextName, now, groupName],
    );
  });

  return getTagGroups({ includeDisabled: true });
}

export async function createManagedTag(input: { name: string; groupName: string }) {
  return createGroupedTag(input.name, input.groupName);
}

export async function updateManagedTag(
  id: number,
  input: { name?: string; groupName?: string; sortOrder?: number; isEnabled?: boolean },
) {
  const current = await queryFirst<TagRow>(
    `
      SELECT id, name, group_name, is_system, is_enabled, sort_order
      FROM tags
      WHERE id = ?
    `,
    [id],
  );
  if (!current) {
    throw new Error("标签不存在。");
  }

  const nextName = input.name === undefined ? String(current.name) : normalizeName(input.name, "标签名称");
  const nextGroup = input.groupName === undefined ? String(current.group_name) : normalizeName(input.groupName, "分类名称");
  const nextSortOrder = input.sortOrder === undefined ? Number(current.sort_order) : Number(input.sortOrder);
  const nextEnabled = input.isEnabled === undefined ? Number(current.is_enabled) : input.isEnabled ? 1 : 0;
  const group = await queryFirst<{ name: string }>("SELECT name FROM tag_groups WHERE name = ?", [nextGroup]);
  if (!group) {
    throw new Error("标签分类无效。");
  }

  await execute(
    `
      UPDATE tags
      SET name = ?, group_name = ?, sort_order = ?, is_enabled = ?, updated_at = ?
      WHERE id = ?
    `,
    [nextName, nextGroup, nextSortOrder, nextEnabled, new Date().toISOString(), id],
  );

  const updated = await queryFirst<TagRow>(
    `
      SELECT id, name, group_name, is_system, is_enabled, sort_order
      FROM tags
      WHERE id = ?
    `,
    [id],
  );
  if (!updated) {
    throw new Error("标签不存在。");
  }

  return rowToTag(updated);
}
