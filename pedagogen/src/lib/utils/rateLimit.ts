import { promises as fs } from 'fs';
import path from 'path';

const RATE_FILE = path.join(process.cwd(), '.heavy-rate.json');

interface RateData {
  date: string;
  count: number;
}

async function readRateData(): Promise<RateData> {
  try {
    const raw = await fs.readFile(RATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { date: '', count: 0 };
  }
}

async function writeRateData(data: RateData): Promise<void> {
  await fs.writeFile(RATE_FILE, JSON.stringify(data, null, 2));
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

const MAX_HEAVY_PER_DAY = 3;

export async function checkHeavyRateLimit(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  // Rate limit disabled for local development
  return { allowed: true, remaining: 999 };
}
