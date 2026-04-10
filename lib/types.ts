export type TagRecord = {
  id: number;
  name: string;
  groupName: string;
  isSystem: boolean;
};

export type TagGroup = {
  groupName: string;
  tags: TagRecord[];
};

export type TemplateListItem = {
  id: string;
  name: string;
  description: string;
  thumbnailPath: string;
  previewVideoPath: string;
  createdAt: string;
  uploadedBy: string;
  tags: string[];
};

export type TemplateDetail = TemplateListItem & {
  templateFilePath: string;
  groupedTags: TagGroup[];
  sourcePathKey: string | null;
  importMode: string | null;
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
