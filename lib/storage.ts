import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { SCAN_ROOT, STORAGE_ROOT } from "@/lib/env";

const contentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".aep": "application/octet-stream",
  ".aet": "application/octet-stream",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];
const TEMPLATE_EXTENSIONS = [".aep", ".aet", ".zip", ".rar", ".7z"];

function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function resolveInsideRoot(rootDir: string, relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, normalized);
  const relative = path.relative(root, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("非法文件路径");
  }

  return absolute;
}

function extFromFileName(fileName: string, fallback: string) {
  const ext = path.extname(fileName).trim().toLowerCase();
  return ext || fallback;
}

function assertAllowedFile(file: File, allowedExtensions: string[], label: string, maxBytes: number) {
  const ext = extFromFileName(file.name, "");
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`${label}文件类型不支持。`);
  }

  if (file.size > maxBytes) {
    throw new Error(`${label}文件过大。`);
  }

  return ext;
}

export function resolveStoragePath(relativePath: string) {
  return resolveInsideRoot(STORAGE_ROOT, relativePath);
}

export function resolveScanPath(relativePath = ".") {
  return resolveInsideRoot(SCAN_ROOT, relativePath);
}

export async function saveUploadedFiles({
  templateId,
  thumbnail,
  previewVideo,
  templateFile,
}: {
  templateId: string;
  thumbnail: File;
  previewVideo: File;
  templateFile: File;
}) {
  const targetDir = resolveStoragePath(path.posix.join("templates", templateId));
  await fs.mkdir(targetDir, { recursive: true });

  const thumbnailExt = assertAllowedFile(thumbnail, IMAGE_EXTENSIONS, "封面图", 30 * 1024 * 1024);
  const previewExt = assertAllowedFile(previewVideo, VIDEO_EXTENSIONS, "预览视频", 2 * 1024 * 1024 * 1024);
  const sourceExt = assertAllowedFile(templateFile, TEMPLATE_EXTENSIONS, "模板", 4 * 1024 * 1024 * 1024);

  const thumbnailRelative = path.posix.join("templates", templateId, `thumbnail${thumbnailExt}`);
  const previewRelative = path.posix.join("templates", templateId, `preview${previewExt}`);
  const sourceRelative = path.posix.join("templates", templateId, `source${sourceExt}`);

  await Promise.all([
    fs.writeFile(resolveStoragePath(thumbnailRelative), Buffer.from(await thumbnail.arrayBuffer())),
    fs.writeFile(resolveStoragePath(previewRelative), Buffer.from(await previewVideo.arrayBuffer())),
    fs.writeFile(resolveStoragePath(sourceRelative), Buffer.from(await templateFile.arrayBuffer())),
  ]);

  return {
    thumbnailRelative,
    previewRelative,
    sourceRelative,
  };
}

export async function readStoredFile(relativePath: string) {
  const absolutePath = resolveStoragePath(relativePath);
  await fs.access(absolutePath);

  const stat = await fs.stat(absolutePath);
  const contentType = getContentType(relativePath);
  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;

  return {
    absolutePath,
    contentType,
    size: stat.size,
    stream,
  };
}

export function getContentType(relativePath: string) {
  const ext = path.extname(relativePath).toLowerCase();
  return contentTypeByExtension[ext] ?? "application/octet-stream";
}

export async function getScanDirectories(relativePath = ".") {
  const absoluteRoot = resolveScanPath(relativePath);
  const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      absolutePath: path.join(absoluteRoot, entry.name),
      relativePath: normalizeRelativePath(path.posix.join(relativePath, entry.name)),
    }));
}

export async function locateTemplateAssets(absoluteDir: string) {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  const thumbnailFile =
    files.find((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())) ?? null;
  const previewFile =
    files.find((file) => VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase())) ?? null;
  const templateFile =
    files.find((file) => TEMPLATE_EXTENSIONS.includes(path.extname(file).toLowerCase())) ?? null;

  return {
    thumbnailFile,
    previewFile,
    templateFile,
  };
}

export function absoluteFileToStorageRelative(absolutePath: string) {
  const root = path.resolve(STORAGE_ROOT);
  const relative = path.relative(root, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("文件不在存储根目录内");
  }

  return normalizeRelativePath(relative);
}
