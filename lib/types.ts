export type UserRole = "user" | "admin";

export type CurrentUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type AdminUserRecord = CurrentUser & {
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
};

export type TagRecord = {
  id: number;
  name: string;
  groupName: string;
  isSystem: boolean;
  isEnabled: boolean;
  sortOrder: number;
};

export type TagGroup = {
  groupName: string;
  isEnabled: boolean;
  sortOrder: number;
  tags: TagRecord[];
};

export type TemplateListItem = {
  id: string;
  name: string;
  description: string;
  thumbnailPath: string;
  previewVideoPath?: string;
  createdAt: string;
  uploadedBy: string;
  tags: string[];
  canPreview: boolean;
  canOpenDetail: boolean;
  canDownload: boolean;
  canDelete: boolean;
};

export type TemplateDetail = TemplateListItem & {
  previewVideoPath: string;
  templateFilePath: string;
  groupedTags: TagGroup[];
  sourcePathKey: string | null;
  importMode: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
};

export type ScanIssue = {
  templateName: string;
  relativePath: string;
  reason: string;
};

export type ScanResult = {
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  issues: ScanIssue[];
};
