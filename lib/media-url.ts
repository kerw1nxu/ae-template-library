function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function getMediaUrl(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `/media/${normalized}`;
}
