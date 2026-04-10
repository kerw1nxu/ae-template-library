export type SystemTagGroup = {
  groupName: string;
  tags: string[];
};

export const SYSTEM_TAG_GROUPS: SystemTagGroup[] = [
  {
    groupName: "用途",
    tags: ["年会", "开场", "片头", "图文包装", "数据展示", "LOGO演绎"],
  },
  {
    groupName: "风格",
    tags: ["科技", "大气", "红金", "简洁", "国潮", "三维"],
  },
  {
    groupName: "行业",
    tags: ["政企", "教育", "医疗", "地产", "汽车", "互联网"],
  },
  {
    groupName: "规格",
    tags: ["16:9", "竖版", "4K", "1080p"],
  },
];

export const SYSTEM_TAG_GROUP_NAMES = SYSTEM_TAG_GROUPS.map((group) => group.groupName);
export const CUSTOM_TAG_GROUP = "自定义";
export const UPLOAD_IMPORT_MODE = "upload";
export const SCAN_IMPORT_MODE = "scan";
