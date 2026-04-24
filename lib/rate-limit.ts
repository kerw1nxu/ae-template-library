type HitBucket = {
  hits: number[];
};

const buckets = new Map<string, HitBucket>();

export function checkRateLimit(input: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const windowStart = now - input.windowMs;
  const bucket = buckets.get(input.key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((hit) => hit > windowStart);

  if (bucket.hits.length >= input.limit) {
    const retryAfterMs = bucket.hits[0] + input.windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(input.key, bucket);
  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}
