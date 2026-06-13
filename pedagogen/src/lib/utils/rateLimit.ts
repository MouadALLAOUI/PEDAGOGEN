export async function checkHeavyRateLimit(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  return { allowed: true, remaining: 999 };
}
