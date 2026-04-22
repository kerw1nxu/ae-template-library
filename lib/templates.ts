import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { execute, queryAll, queryFirst, transaction } from "@/lib/db";
import {
  CUSTOM_TAG_GROUP,
  SCAN_IMPORT_MODE,
  SYSTEM_TAG_GROUP_NAMES,
  UPLOAD_IMPORT_MODE,
} from "@/lib/constants";
import {
  absoluteFileToStorageRelative,
  getScanDirectories,
  locateTemplateAssets,
  saveUploadedFiles,
} from "@/lib/storage";
import { HttpError, invariant } from "@/lib/http";
import type {
  ScanIssue,
  ScanResult,
  TagGroup,
  TagRecord,
  TemplateDetail,
  TemplateListItem,
} from "@/lib/types";

type SearchOptions = {
  query?: string;
  tags?: string[];
};

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  thumbnail_path: string;
  preview_video_path: string;
  template_file_path: string;
  created_at: string;
  uploaded_by: string;
  tag_names: string | null;
  source_path_key?: string | null;
  import_mode?: string | null;
};

function parseTagsCsv(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function rowToListItem(row: TemplateRow): TemplateListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    thumbnailPath: row.thumbnail_path,
    previewVideoPath: row.preview_video_path,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by,
    tags: parseTagsCsv(row.tag_names),
  };
}

async function getTagRows() {
  return queryAll<{
    id: number;
    name: string;
    group_name: string;
    is_system: number;
  }>(
    `
      SELECT id, name, group_name, is_system
      FROM tags
      ORDER BY
        CASE WHEN group_name = ? THEN 1 ELSE 0 END,
        group_name ASC,
        is_system DESC,
        name COLLATE NOCASE ASC
    `,
    [CUSTOM_TAG_GROUP],
  );
}

async function resolveTagIds(tagNames: string[]) {
  const uniqueNames = Array.from(new Set(tagNames.map((item) => item.trim()).filter(Boolean)));
  const tagIds = new Set<number>();

  for (const tag of uniqueNames) {
    const existing = await queryFirst<{ id: number; is_system: number }>(
      "SELECT id, is_system FROM tags WHERE name = ?",
      [tag],
    );

    if (existing) {
      tagIds.add(Number(existing.id));
      continue;
    }

    await execute(
      "INSERT INTO tags (name, group_name, is_system) VALUES (?, ?, 0)",
      [tag, CUSTOM_TAG_GROUP],
    );

    const created = await queryFirst<{ id: number }>("SELECT id FROM tags WHERE name = ?", [tag]);
    if (created) {
      tagIds.add(Number(created.id));
    }
  }

  return Array.from(tagIds);
}

export async function createGroupedTag(name: string, groupName: string): Promise<TagRecord> {
  const normalizedName = name.trim();
  const normalizedGroup = groupName.trim();

  invariant(normalizedName, 400, "标签名不能为空。");

  if (!SYSTEM_TAG_GROUP_NAMES.includes(normalizedGroup)) {
    throw new HttpError(400, "标签分组不合法。");
  }

  const existing = await queryFirst<{
    id: number;
    name: string;
    group_name: string;
    is_system: number;
  }>("SELECT id, name, group_name, is_system FROM tags WHERE name = ?", [normalizedName]);

  if (existing) {
    if (String(existing.group_name) !== normalizedGroup) {
      throw new HttpError(400, "同名标签已经存在于其他分组。");
    }

    return {
      id: Number(existing.id),
      name: String(existing.name),
      groupName: String(existing.group_name),
      isSystem: Boolean(existing.is_system),
    };
  }

  await execute("INSERT INTO tags (name, group_name, is_system) VALUES (?, ?, 0)", [
    normalizedName,
    normalizedGroup,
  ]);

  const created = await queryFirst<{
    id: number;
    name: string;
    group_name: string;
    is_system: number;
  }>("SELECT id, name, group_name, is_system FROM tags WHERE name = ?", [normalizedName]);

  invariant(created, 500, "标签创建失败。");

  return {
    id: Number(created.id),
    name: String(created.name),
    groupName: String(created.group_name),
    isSystem: Boolean(created.is_system),
  };
}

async function buildGroupedTags(templateId: string) {
  const tagRows = await queryAll<{
    id: number;
    name: string;
    group_name: string;
    is_system: number;
  }>(
    `
      SELECT tags.id, tags.name, tags.group_name, tags.is_system
      FROM template_tags
      JOIN tags ON tags.id = template_tags.tag_id
      WHERE template_tags.template_id = ?
      ORDER BY
        CASE WHEN tags.group_name = ? THEN 1 ELSE 0 END,
        tags.group_name ASC,
        tags.name COLLATE NOCASE ASC
    `,
    [templateId, CUSTOM_TAG_GROUP],
  );

  const groupedMap = new Map<string, TagRecord[]>();
  for (const tag of tagRows) {
    const bucket = groupedMap.get(String(tag.group_name)) ?? [];
    bucket.push({
      id: Number(tag.id),
      name: String(tag.name),
      groupName: String(tag.group_name),
      isSystem: Boolean(tag.is_system),
    });
    groupedMap.set(String(tag.group_name), bucket);
  }

  return Array.from(groupedMap.entries()).map(([groupName, tags]) => ({
    groupName,
    tags,
  }));
}

export async function getTagGroups(): Promise<TagGroup[]> {
  const rows = await getTagRows();
  const grouped = new Map<string, TagRecord[]>();

  for (const row of rows) {
    const record: TagRecord = {
      id: Number(row.id),
      name: String(row.name),
      groupName: String(row.group_name),
      isSystem: Boolean(row.is_system),
    };

    const bucket = grouped.get(record.groupName) ?? [];
    bucket.push(record);
    grouped.set(record.groupName, bucket);
  }

  return Array.from(grouped.entries()).map(([groupName, tags]) => ({
    groupName,
    tags,
  }));
}

export async function searchTemplates(options: SearchOptions = {}) {
  const query = (options.query ?? "").trim();
  const tags = Array.from(new Set((options.tags ?? []).filter(Boolean)));
  const values: Array<string | number> = [];
  const conditions: string[] = [];

  if (query) {
    conditions.push(`
      (
        t.name LIKE ?
        OR EXISTS (
          SELECT 1
          FROM template_tags ttx
          JOIN tags tgx ON tgx.id = ttx.tag_id
          WHERE ttx.template_id = t.id
            AND tgx.name LIKE ?
        )
      )
    `);
    const pattern = `%${query}%`;
    values.push(pattern, pattern);
  }

  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(", ");
    conditions.push(`
      t.id IN (
        SELECT ttf.template_id
        FROM template_tags ttf
        JOIN tags tgf ON tgf.id = ttf.tag_id
        WHERE tgf.name IN (${placeholders})
        GROUP BY ttf.template_id
        HAVING COUNT(DISTINCT tgf.name) = ?
      )
    `);
    values.push(...tags, tags.length);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await queryAll<TemplateRow>(
    `
      SELECT
        t.id,
        t.name,
        t.description,
        t.thumbnail_path,
        t.preview_video_path,
        t.template_file_path,
        t.created_at,
        t.uploaded_by,
        t.source_path_key,
        t.import_mode,
        GROUP_CONCAT(DISTINCT tg.name) AS tag_names
      FROM templates t
      LEFT JOIN template_tags tt ON tt.template_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC, t.name COLLATE NOCASE ASC
    `,
    values,
  );

  return rows.map(rowToListItem);
}

export async function getTemplateById(id: string): Promise<TemplateDetail | null> {
  const row = await queryFirst<TemplateRow>(
    `
      SELECT
        t.id,
        t.name,
        t.description,
        t.thumbnail_path,
        t.preview_video_path,
        t.template_file_path,
        t.created_at,
        t.uploaded_by,
        t.source_path_key,
        t.import_mode,
        GROUP_CONCAT(DISTINCT tg.name) AS tag_names
      FROM templates t
      LEFT JOIN template_tags tt ON tt.template_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return {
    ...rowToListItem(row),
    templateFilePath: String(row.template_file_path),
    groupedTags: await buildGroupedTags(id),
    sourcePathKey: row.source_path_key ? String(row.source_path_key) : null,
    importMode: row.import_mode ? String(row.import_mode) : null,
  };
}

export function splitCustomTags(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[、,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function insertTemplateWithTagIds(
  db: Database,
  input: {
    id: string;
    name: string;
    description: string;
    thumbnailPath: string;
    previewVideoPath: string;
    templateFilePath: string;
    createdAt: string;
    uploadedBy: string;
    sourcePathKey?: string | null;
    importMode?: string | null;
  },
  tagIds: number[],
) {
  db.run(
    `
      INSERT INTO templates (
        id, name, description, thumbnail_path, preview_video_path, template_file_path,
        created_at, uploaded_by, source_path_key, import_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.id,
      input.name,
      input.description,
      input.thumbnailPath,
      input.previewVideoPath,
      input.templateFilePath,
      input.createdAt,
      input.uploadedBy,
      input.sourcePathKey ?? null,
      input.importMode ?? null,
    ],
  );

  for (const tagId of tagIds) {
    db.run("INSERT INTO template_tags (template_id, tag_id) VALUES (?, ?)", [input.id, tagId]);
  }
}

export async function createTemplateEntry(input: {
  name: string;
  description: string;
  uploadedBy?: string;
  systemTags: string[];
  customTags: string[];
  thumbnail: File;
  previewVideo: File;
  templateFile: File;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const uploadedBy = input.uploadedBy?.trim() || "管理员";
  const allTags = [...input.systemTags, ...input.customTags];
  const tagIds = await resolveTagIds(allTags);
  const stored = await saveUploadedFiles({
    templateId: id,
    thumbnail: input.thumbnail,
    previewVideo: input.previewVideo,
    templateFile: input.templateFile,
  });

  await transaction(async (db) => {
    await insertTemplateWithTagIds(
      db,
      {
        id,
        name: input.name.trim(),
        description: input.description.trim(),
        thumbnailPath: stored.thumbnailRelative,
        previewVideoPath: stored.previewRelative,
        templateFilePath: stored.sourceRelative,
        createdAt,
        uploadedBy,
        sourcePathKey: null,
        importMode: UPLOAD_IMPORT_MODE,
      },
      tagIds,
    );
  });

  return getTemplateById(id);
}

export async function updateTemplateTags(templateId: string, tagNames: string[]) {
  const template = await queryFirst<{ id: string }>("SELECT id FROM templates WHERE id = ?", [templateId]);
  invariant(template, 404, "模板不存在。");

  const tagIds = await resolveTagIds(tagNames);

  await transaction((db) => {
    db.run("DELETE FROM template_tags WHERE template_id = ?", [templateId]);
    for (const tagId of tagIds) {
      db.run("INSERT INTO template_tags (template_id, tag_id) VALUES (?, ?)", [templateId, tagId]);
    }
  });

  return getTemplateById(templateId);
}

function isMissingScanAsset(assets: {
  thumbnailFile: string | null;
  previewFile: string | null;
  templateFile: string | null;
}) {
  return !assets.thumbnailFile || !assets.previewFile || !assets.templateFile;
}

function scanIssue(relativePath: string, templateName: string, reason: string): ScanIssue {
  return {
    relativePath,
    templateName,
    reason,
  };
}

export async function scanTemplateLibrary(relativePath = "."): Promise<ScanResult> {
  const directories = await getScanDirectories(relativePath);
  const result: ScanResult = {
    scanned: directories.length,
    created: 0,
    updated: 0,
    skipped: 0,
    issues: [],
  };

  for (const dir of directories) {
    const templateName = dir.name.trim();
    if (!templateName) {
      result.skipped += 1;
      result.issues.push(scanIssue(dir.relativePath, dir.name, "目录名称不能为空。"));
      continue;
    }

    const assets = await locateTemplateAssets(dir.absolutePath);
    if (isMissingScanAsset(assets)) {
      result.skipped += 1;
      result.issues.push(
        scanIssue(
          dir.relativePath,
          templateName,
          "目录中必须同时包含封面图、预览视频和模板源文件。",
        ),
      );
      continue;
    }

    const thumbnailPath = absoluteFileToStorageRelative(path.join(dir.absolutePath, assets.thumbnailFile!));
    const previewVideoPath = absoluteFileToStorageRelative(path.join(dir.absolutePath, assets.previewFile!));
    const templateFilePath = absoluteFileToStorageRelative(path.join(dir.absolutePath, assets.templateFile!));
    const existing = await queryFirst<{ id: string }>(
      "SELECT id FROM templates WHERE source_path_key = ?",
      [dir.relativePath],
    );

    if (existing) {
      await transaction((db) => {
        db.run(
          `
            UPDATE templates
            SET name = ?, thumbnail_path = ?, preview_video_path = ?, template_file_path = ?, import_mode = ?
            WHERE id = ?
          `,
          [templateName, thumbnailPath, previewVideoPath, templateFilePath, SCAN_IMPORT_MODE, existing.id],
        );
      });
      result.updated += 1;
      continue;
    }

    const id = randomUUID();
    await transaction(async (db) => {
      await insertTemplateWithTagIds(
        db,
        {
          id,
          name: templateName,
          description: "",
          thumbnailPath,
          previewVideoPath,
          templateFilePath,
          createdAt: new Date().toISOString(),
          uploadedBy: "扫描导入",
          sourcePathKey: dir.relativePath,
          importMode: SCAN_IMPORT_MODE,
        },
        [],
      );
    });
    result.created += 1;
  }

  return result;
}

export async function writeScanReport(scanResult: ScanResult, reportPath: string) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(scanResult, null, 2), "utf8");
}
