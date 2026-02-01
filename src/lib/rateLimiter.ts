/**
 * Per-provider rate limiter using token bucket pattern.
 * Tracks both RPM (requests per minute) and RPD (requests per day).
 * Persists in-memory only (resets on server restart, which is fine for a cron worker).
 */

interface BucketState {
  minuteTokens: number;
  dayTokens: number;
  lastMinuteRefill: number;
  lastDayRefill: number;
  backoffUntil: number; // timestamp - don't send requests until this time
}

const buckets = new Map<string, BucketState>();

export function canMakeRequest(providerModel: string, limits: { rpm: number; rpd: number }): boolean {
  const now = Date.now();
  const bucket = getOrCreateBucket(providerModel, limits);

  // Check backoff
  if (now < bucket.backoffUntil) return false;

  // Refill minute tokens
  const minuteElapsed = now - bucket.lastMinuteRefill;
  if (minuteElapsed >= 60_000) {
    bucket.minuteTokens = limits.rpm;
    bucket.lastMinuteRefill = now;
  }

  // Refill day tokens (every 24h)
  const dayElapsed = now - bucket.lastDayRefill;
  if (dayElapsed >= 86_400_000) {
    bucket.dayTokens = limits.rpd;
    bucket.lastDayRefill = now;
  }

  return bucket.minuteTokens > 0 && bucket.dayTokens > 0;
}

export function consumeRequest(providerModel: string, limits: { rpm: number; rpd: number }): void {
  const bucket = getOrCreateBucket(providerModel, limits);
  bucket.minuteTokens = Math.max(0, bucket.minuteTokens - 1);
  bucket.dayTokens = Math.max(0, bucket.dayTokens - 1);
}

export function applyBackoff(providerModel: string, attempt: number): void {
  const bucket = buckets.get(providerModel);
  if (!bucket) return;
  // Exponential backoff: 30s, 60s, 120s, 240s, capped at 5 min
  const backoffMs = Math.min(30_000 * Math.pow(2, attempt - 1), 300_000);
  bucket.backoffUntil = Date.now() + backoffMs;
}

export function getRateLimitStatus(): Record<string, { minuteTokens: number; dayTokens: number; backoffUntil: number }> {
  const status: Record<string, { minuteTokens: number; dayTokens: number; backoffUntil: number }> = {};
  for (const [key, bucket] of buckets.entries()) {
    status[key] = {
      minuteTokens: bucket.minuteTokens,
      dayTokens: bucket.dayTokens,
      backoffUntil: bucket.backoffUntil,
    };
  }
  return status;
}

function getOrCreateBucket(providerModel: string, limits: { rpm: number; rpd: number }): BucketState {
  let bucket = buckets.get(providerModel);
  if (!bucket) {
    const now = Date.now();
    bucket = {
      minuteTokens: limits.rpm,
      dayTokens: limits.rpd,
      lastMinuteRefill: now,
      lastDayRefill: now,
      backoffUntil: 0,
    };
    buckets.set(providerModel, bucket);
  }
  return bucket;
}
