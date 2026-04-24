import type { TagGroup, TagRecord } from "@/lib/types";

export function mergeTagIntoGroups(tagGroups: TagGroup[], tag: TagRecord) {
  let matched = false;

  const nextGroups = tagGroups.map((group) => {
    if (group.groupName !== tag.groupName) {
      return group;
    }

    matched = true;
    const exists = group.tags.some((item) => item.id === tag.id || item.name === tag.name);
    if (exists) {
      return group;
    }

    return {
      ...group,
      tags: [...group.tags, tag].sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
    };
  });

  if (matched) {
    return nextGroups;
  }

  return [
    ...nextGroups,
    {
      groupName: tag.groupName,
      isEnabled: true,
      sortOrder: 999,
      tags: [tag],
    },
  ];
}
