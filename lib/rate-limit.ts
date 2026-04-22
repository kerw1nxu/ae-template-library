import { HttpError } from "@/lib/http";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getBucketKey(scope: string, identifier: string) {
  return `${scope}:${identifier}`;
}

export function enforceRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}) {
  const key = getBucketKey(scope, identifier);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    throw new HttpError(429, "请求过于频繁，请稍后再试。");
  }

  existing.count += 1;
}
