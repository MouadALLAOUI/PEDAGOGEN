import type { CourseMetadata, GenerationMode } from '@/types/generation';

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateGenerationTokens(
  mode: GenerationMode,
  metadata: CourseMetadata
): { min: number; max: number } {
  const metadataTokens = estimateTokens(JSON.stringify(metadata));

  switch (mode) {
    case 'light':
      return { min: 500, max: 2000 };
    case 'medium':
      return { min: 3000 + metadataTokens, max: 12000 + metadataTokens };
    case 'heavy':
      return { min: 15000 + metadataTokens, max: 30000 + metadataTokens };
  }
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}
