import path from "node:path";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TEMPLATE_EXTENSIONS,
  ALLOWED_TEMPLATE_TYPES,
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
  PREVIEW_VIDEO_MAX_SIZE,
  TEMPLATE_FILE_MAX_SIZE,
  THUMBNAIL_MAX_SIZE,
} from "@/lib/constants";
import { HttpError } from "@/lib/http";

function getExtension(fileName: string) {
  return path.extname(fileName).trim().toLowerCase();
}

function validateFile({
  file,
  label,
  maxSize,
  allowedExtensions,
  allowedTypes,
}: {
  file: File;
  label: string;
  maxSize: number;
  allowedExtensions: Set<string>;
  allowedTypes: Set<string>;
}) {
  const extension = getExtension(file.name);
  if (!allowedExtensions.has(extension)) {
    throw new HttpError(400, `${label}格式不支持。`);
  }

  if (file.size > maxSize) {
    throw new HttpError(400, `${label}超过大小限制。`);
  }

  if (file.type && !allowedTypes.has(file.type)) {
    throw new HttpError(400, `${label}类型校验失败。`);
  }
}

export function validateTemplateUpload(input: {
  thumbnail: File;
  previewVideo: File;
  templateFile: File;
}) {
  validateFile({
    file: input.thumbnail,
    label: "封面图片",
    maxSize: THUMBNAIL_MAX_SIZE,
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
  validateFile({
    file: input.previewVideo,
    label: "预览视频",
    maxSize: PREVIEW_VIDEO_MAX_SIZE,
    allowedExtensions: ALLOWED_VIDEO_EXTENSIONS,
    allowedTypes: ALLOWED_VIDEO_TYPES,
  });
  validateFile({
    file: input.templateFile,
    label: "模板文件",
    maxSize: TEMPLATE_FILE_MAX_SIZE,
    allowedExtensions: ALLOWED_TEMPLATE_EXTENSIONS,
    allowedTypes: ALLOWED_TEMPLATE_TYPES,
  });
}
