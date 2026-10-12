const MAX_REQUESTS = 30; // 30 generations per hour
const WINDOW_MS = 60 * 60 * 1000;

interface RateRecord {
  count: number;
  resetAt: number;
}

const limitStore = new Map<string, RateRecord>();

export async function checkHeavyRateLimit(userId?: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const key = userId || 'anonymous';
  const now = Date.now();
  const record = limitStore.get(key);

  if (!record || now > record.resetAt) {
    limitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

export async function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const record = limitStore.get(key);

  if (!record || now > record.resetAt) {
    limitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}
