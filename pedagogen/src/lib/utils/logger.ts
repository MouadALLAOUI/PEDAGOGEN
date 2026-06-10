import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export function logGenerationError(mode: string, step: string, error: unknown): void {
  const logDir = join(process.cwd(), 'data');
  if (!existsSync(logDir)) {
    try {
      mkdirSync(logDir, { recursive: true });
    } catch {
      // Ignore if dir creation fails
    }
  }

  const logFile = join(logDir, 'generation.log');
  const timestamp = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';

  const logLine = `[${timestamp}] [${mode.toUpperCase()}] [Step: ${step}] ERROR: ${errMsg}
${stack ? stack + '\n' : ''}--------------------------------------------------------------------------------\n`;

  try {
    appendFileSync(logFile, logLine);
  } catch (e) {
    console.error("Failed to write to generation.log", e);
  }
}
