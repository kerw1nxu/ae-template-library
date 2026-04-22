export type SystemTagGroup = {
  groupName: string;
  tags: string[];
};

export const SYSTEM_TAG_GROUPS: SystemTagGroup[] = [
  {
    groupName: "风格",
    tags: ["科技感", "极简", "商务", "活力", "高级感", "Logo 动画"],
  },
  {
    groupName: "用途",
    tags: ["片头", "转场", "字幕", "包装", "产品展示", "社媒短片"],
  },
  {
    groupName: "行业",
    tags: ["电商", "教育", "金融", "地产", "汽车", "医疗"],
  },
  {
    groupName: "规格",
    tags: ["16:9", "竖版", "4K", "1080p"],
  },
];

export const SYSTEM_TAG_GROUP_NAMES = SYSTEM_TAG_GROUPS.map((group) => group.groupName);
export const CUSTOM_TAG_GROUP = "自定义标签";
export const UPLOAD_IMPORT_MODE = "upload";
export const SCAN_IMPORT_MODE = "scan";

export const SESSION_COOKIE_NAME = "ae_template_session";
export const SESSION_TTL_DAYS = 14;

export const THUMBNAIL_MAX_SIZE = 10 * 1024 * 1024;
export const PREVIEW_VIDEO_MAX_SIZE = 150 * 1024 * 1024;
export const TEMPLATE_FILE_MAX_SIZE = 1024 * 1024 * 1024;

export const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
export const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);
export const ALLOWED_TEMPLATE_EXTENSIONS = new Set([".aep", ".aet", ".zip", ".rar", ".7z"]);

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export const ALLOWED_TEMPLATE_TYPES = new Set([
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
]);
