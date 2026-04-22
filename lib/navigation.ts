export function sanitizeNextPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/library";
  }

  if (nextPath.startsWith("//")) {
    return "/library";
  }

  return nextPath;
}
