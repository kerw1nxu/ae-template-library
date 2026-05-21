import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { SCAN_IMPORT_MODE, UPLOAD_IMPORT_MODE } from "@/lib/constants";
import { queryAll, queryFirst, transaction, execute } from "@/lib/db";
import {
  absoluteFileToStorageRelative,
  getScanDirectories,
  locateTemplateAssets,
  resolveStoragePath,
  saveAutoImportedTemplateFiles,
} from "@/lib/storage";
import { getTagGroups, resolveTagIds } from "@/lib/tags";
import type { CurrentUser, ScanIssue, ScanResult, TagRecord, TemplateDetail, TemplateListItem } from "@/lib/types";
import { fetchVjshiTemplateAssets } from "@/lib/vjshi";

const KEYWORD_FILE_MAX_BYTES = 1024 * 1024;

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
  source_path_key: string | null;
  import_mode: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

function parseTagsCsv(value: string | null | undefined) {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function parseSearchKeywords(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[\s,，]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function readScanSearchKeywords(keywordPath: string) {
  const stat = await fs.stat(keywordPath);
  if (stat.size > KEYWORD_FILE_MAX_BYTES) {
    throw new Error("TXT 关键词文件过大");
  }

  const keywords = parseSearchKeywords(await fs.readFile(keywordPath, "utf8"));
  if (keywords.length === 0) {
    throw new Error("TXT 关键词文件不能为空");
  }

  return keywords;
}

function listCapabilities(viewer?: CurrentUser | null) {
  const loggedIn = Boolean(viewer);
  return {
    canPreview: loggedIn,
    canOpenDetail: loggedIn,
    canDownload: loggedIn,
    canDelete: viewer?.role === "admin",
  };
}

function rowToListItem(row: TemplateRow, viewer?: CurrentUser | null): TemplateListItem {
  const capabilities = listCapabilities(viewer);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    thumbnailPath: row.thumbnail_path,
    previewVideoPath: capabilities.canPreview ? row.preview_video_path : undefined,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by,
    tags: parseTagsCsv(row.tag_names),
    ...capabilities,
  };
}

async function buildGroupedTags(templateId: string) {
  const tagRows = await queryAll<{
    id: number;
    name: string;
    group_name: string;
    is_system: number;
    is_enabled: number;
    sort_order: number;
  }>(
    `
      SELECT tags.id, tags.name, tags.group_name, tags.is_system, tags.is_enabled, tags.sort_order
      FROM template_tags
      JOIN tags ON tags.id = template_tags.tag_id
      JOIN tag_groups ON tag_groups.name = tags.group_name
      WHERE template_tags.template_id = ?
        AND tags.is_enabled = 1
        AND tag_groups.is_enabled = 1
      ORDER BY tag_groups.sort_order ASC, tags.sort_order ASC, tags.name COLLATE NOCASE ASC
    `,
    [templateId],
  );

  const groups = await getTagGroups();
  const grouped = new Map(groups.map((group) => [group.groupName, { ...group, tags: [] as TagRecord[] }]));

  for (const row of tagRows) {
    const bucket = grouped.get(String(row.group_name));
    if (!bucket) {
      continue;
    }
    bucket.tags.push({
      id: Number(row.id),
      name: String(row.name),
      groupName: String(row.group_name),
      isSystem: Boolean(row.is_system),
      isEnabled: Boolean(row.is_enabled),
      sortOrder: Number(row.sort_order),
    });
  }

  return Array.from(grouped.values()).filter((group) => group.tags.length > 0);
}

export async function searchTemplates(options: SearchOptions = {}, viewer?: CurrentUser | null) {
  const query = (options.query ?? "").trim();
  const tags = Array.from(new Set((options.tags ?? []).filter(Boolean)));
  const params: Array<string | number> = [];
  const conditions = ["templates.deleted_at IS NULL"];

  if (query) {
    conditions.push(`
      (
        templates.name LIKE ?
        OR EXISTS (
          SELECT 1
          FROM template_tags search_tt
          JOIN tags search_tags ON search_tags.id = search_tt.tag_id
          WHERE search_tt.template_id = templates.id
            AND search_tags.is_enabled = 1
            AND search_tags.name LIKE ?
        )
        OR EXISTS (
          SELECT 1
          FROM template_search_keywords search_keywords
          WHERE search_keywords.template_id = templates.id
            AND search_keywords.keyword LIKE ?
        )
      )
    `);
    params.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  if (tags.length > 0) {
    conditions.push(`
      templates.id IN (
        SELECT filter_tt.template_id
        FROM template_tags filter_tt
        JOIN tags filter_tags ON filter_tags.id = filter_tt.tag_id
        WHERE filter_tags.is_enabled = 1
          AND filter_tags.name IN (${tags.map(() => "?").join(", ")})
        GROUP BY filter_tt.template_id
        HAVING COUNT(DISTINCT filter_tags.name) = ?
      )
    `);
    params.push(...tags, tags.length);
  }

  const rows = await queryAll<TemplateRow>(
    `
      SELECT
        templates.id,
        templates.name,
        templates.description,
        templates.thumbnail_path,
        templates.preview_video_path,
        templates.template_file_path,
        templates.created_at,
        templates.uploaded_by,
        templates.source_path_key,
        templates.import_mode,
        templates.deleted_at,
        templates.deleted_by,
        GROUP_CONCAT(DISTINCT tags.name) AS tag_names
      FROM templates
      LEFT JOIN template_tags ON template_tags.template_id = templates.id
      LEFT JOIN tags ON tags.id = template_tags.tag_id AND tags.is_enabled = 1
      WHERE ${conditions.join(" AND ")}
      GROUP BY templates.id
      ORDER BY templates.created_at DESC, templates.name COLLATE NOCASE ASC
    `,
    params,
  );

  return rows.map((row) => rowToListItem(row, viewer));
}

export async function getTemplateById(id: string, viewer?: CurrentUser | null): Promise<TemplateDetail | null> {
  const [row, keywordRows] = await Promise.all([
    queryFirst<TemplateRow>(
    `
      SELECT
        templates.id,
        templates.name,
        templates.description,
        templates.thumbnail_path,
        templates.preview_video_path,
        templates.template_file_path,
        templates.created_at,
        templates.uploaded_by,
        templates.source_path_key,
        templates.import_mode,
        templates.deleted_at,
        templates.deleted_by,
        GROUP_CONCAT(DISTINCT tags.name) AS tag_names
      FROM templates
      LEFT JOIN template_tags ON template_tags.template_id = templates.id
      LEFT JOIN tags ON tags.id = template_tags.tag_id AND tags.is_enabled = 1
      WHERE templates.id = ?
        AND templates.deleted_at IS NULL
      GROUP BY templates.id
    `,
    [id],
    ),
    queryAll<{ keyword: string }>(
      `
        SELECT keyword
        FROM template_search_keywords
        WHERE template_id = ?
        ORDER BY keyword COLLATE NOCASE ASC
      `,
      [id],
    ),
  ]);

  if (!row) {
    return null;
  }

  return {
    ...rowToListItem(row, viewer),
    previewVideoPath: row.preview_video_path,
    templateFilePath: row.template_file_path,
    searchKeywords: keywordRows.map((item) => String(item.keyword)),
    groupedTags: await buildGroupedTags(id),
    sourcePathKey: row.source_path_key,
    importMode: row.import_mode,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

export async function getMediaAccess(relativePath: string, viewer?: CurrentUser | null) {
  const row = await queryFirst<{ thumbnail_path: string; preview_video_path: string }>(
    `
      SELECT thumbnail_path, preview_video_path
      FROM templates
      WHERE deleted_at IS NULL
        AND (thumbnail_path = ? OR preview_video_path = ?)
    `,
    [relativePath, relativePath],
  );

  if (!row) {
    return { allowed: false, status: 404, reason: "媒体文件不存在。" };
  }
  if (String(row.thumbnail_path) === relativePath) {
    return { allowed: true, status: 200, reason: "" };
  }
  if (!viewer) {
    return { allowed: false, status: 401, reason: "登录后才能播放预览视频。" };
  }

  return { allowed: true, status: 200, reason: "" };
}

export function splitCustomTags(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[，,]/)
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
    searchKeywords: string[];
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

  replaceTemplateSearchKeywords(db, input.id, input.searchKeywords);
}

function replaceTemplateSearchKeywords(db: Database, templateId: string, searchKeywords: string[]) {
  db.run("DELETE FROM template_search_keywords WHERE template_id = ?", [templateId]);
  for (const keyword of searchKeywords) {
    db.run("INSERT INTO template_search_keywords (template_id, keyword) VALUES (?, ?)", [templateId, keyword]);
  }
}

export async function createTemplateEntry(input: {
  uploadedBy: string;
  templateFile: File;
}) {
  const vjshiId = input.templateFile.name.match(/\d{5,}/)?.[0];
  if (!vjshiId) {
    throw new Error("模板压缩包文件名中没有找到 VJshi 编号。");
  }

  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM templates WHERE source_path_key = ? AND deleted_at IS NULL",
    [`vjshi:${vjshiId}`],
  );
  if (existing) {
    throw new Error("该 VJshi 编号已入库。");
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const vjshiAssets = await fetchVjshiTemplateAssets(vjshiId);
  const stored = await saveAutoImportedTemplateFiles({
    templateId: id,
    templateFile: input.templateFile,
    thumbnail: vjshiAssets.thumbnail,
    previewVideo: vjshiAssets.previewVideo,
    keywordsText: vjshiAssets.keywords.join("\n"),
  });

  await transaction((db) =>
    insertTemplateWithTagIds(
      db,
      {
        id,
        name: vjshiAssets.title,
        description: `VJshi 编号：${vjshiAssets.vjshiId}`,
        thumbnailPath: stored.thumbnailRelative,
        previewVideoPath: stored.previewRelative,
        templateFilePath: stored.sourceRelative,
        createdAt,
        uploadedBy: input.uploadedBy,
        sourcePathKey: `vjshi:${vjshiId}`,
        importMode: UPLOAD_IMPORT_MODE,
        searchKeywords: vjshiAssets.keywords,
      },
      [],
    ),
  );

  return getTemplateById(id);
}

export async function updateTemplateTags(templateId: string, tagNames: string[]) {
  const template = await queryFirst<{ id: string }>(
    "SELECT id FROM templates WHERE id = ? AND deleted_at IS NULL",
    [templateId],
  );
  if (!template) {
    throw new Error("模板不存在");
  }

  const tagIds = await resolveTagIds(tagNames);
  await transaction((db) => {
    db.run("DELETE FROM template_tags WHERE template_id = ?", [templateId]);
    for (const tagId of tagIds) {
      db.run("INSERT INTO template_tags (template_id, tag_id) VALUES (?, ?)", [templateId, tagId]);
    }
  });

  return getTemplateById(templateId);
}

export async function softDeleteTemplate(templateId: string, adminId: string) {
  const template = await queryFirst<{ id: string; template_file_path: string }>(
    "SELECT id, template_file_path FROM templates WHERE id = ? AND deleted_at IS NULL",
    [templateId],
  );
  if (!template) {
    throw new Error("模板不存在");
  }

  await hardDeleteTemplateRecord(templateId);
  await removeStoredTemplateDirectory(String(template.template_file_path));
  void adminId;
}

async function hardDeleteTemplateRecord(templateId: string) {
  await transaction((db) => {
    db.run("DELETE FROM download_events WHERE template_id = ?", [templateId]);
    db.run("DELETE FROM template_search_keywords WHERE template_id = ?", [templateId]);
    db.run("DELETE FROM template_tags WHERE template_id = ?", [templateId]);
    db.run("DELETE FROM templates WHERE id = ?", [templateId]);
  });
}

async function removeStoredTemplateDirectory(templateFilePath: string) {
  const match = templateFilePath.match(/^templates\/([^/]+)\//);
  if (!match) {
    return;
  }

  await fs.rm(resolveStoragePath(`templates/${match[1]}`), { recursive: true, force: true });
}

export async function purgeSoftDeletedTemplates() {
  const rows = await queryAll<{ id: string; template_file_path: string }>(
    "SELECT id, template_file_path FROM templates WHERE deleted_at IS NOT NULL",
  );

  for (const row of rows) {
    await hardDeleteTemplateRecord(String(row.id));
    await removeStoredTemplateDirectory(String(row.template_file_path));
  }

  return rows.length;
}

export async function recordDownloadEvent(input: {
  templateId: string;
  userId: string;
  ip: string;
  userAgent: string;
}) {
  await execute(
    `
      INSERT INTO download_events (id, template_id, user_id, downloaded_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [randomUUID(), input.templateId, input.userId, new Date().toISOString(), input.ip, input.userAgent],
  );
}

function scanIssue(relativePath: string, templateName: string, reason: string): ScanIssue {
  return { relativePath, templateName, reason };
}

function isMissingScanAsset(assets: {
  thumbnailFile: string | null;
  previewFile: string | null;
  templateFile: string | null;
  keywordFile: string | null;
}) {
  return !assets.thumbnailFile || !assets.previewFile || !assets.templateFile || !assets.keywordFile;
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
      result.issues.push(scanIssue(dir.relativePath, dir.name, "目录名为空，无法作为模板名称"));
      continue;
    }

    const assets = await locateTemplateAssets(dir.absolutePath);
    if (isMissingScanAsset(assets)) {
      result.skipped += 1;
      result.issues.push(scanIssue(dir.relativePath, templateName, "目录内缺少图片、视频、模板文件或 TXT 关键词文件"));
      continue;
    }

    let searchKeywords: string[];
    try {
      searchKeywords = await readScanSearchKeywords(path.join(dir.absolutePath, assets.keywordFile!));
    } catch (error) {
      result.skipped += 1;
      result.issues.push(scanIssue(dir.relativePath, templateName, error instanceof Error ? error.message : "TXT 关键词文件无效"));
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
            SET name = ?, thumbnail_path = ?, preview_video_path = ?, template_file_path = ?, import_mode = ?, deleted_at = NULL, deleted_by = NULL
            WHERE id = ?
          `,
          [templateName, thumbnailPath, previewVideoPath, templateFilePath, SCAN_IMPORT_MODE, existing.id],
        );
        replaceTemplateSearchKeywords(db, existing.id, searchKeywords);
      });
      result.updated += 1;
      continue;
    }

    const id = randomUUID();
    await transaction((db) =>
      insertTemplateWithTagIds(
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
          searchKeywords,
        },
        [],
      ),
    );
    result.created += 1;
  }

  return result;
}

export async function writeScanReport(scanResult: ScanResult, reportPath: string) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(scanResult, null, 2), "utf8");
}
