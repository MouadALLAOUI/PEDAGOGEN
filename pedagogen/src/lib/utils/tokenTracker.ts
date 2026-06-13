import { estimateTokens } from './tokenEstimator';

export interface TokenReport {
  beforeTokens: number;
  afterTokens: number;
  savings: number;
  savingsPercent: string;
  breakdown: { section: string; tokens: number }[];
}

export function generateTokenReport(parts: { label: string; text: string }[]): TokenReport {
  const breakdown = parts.map(p => ({
    section: p.label,
    tokens: estimateTokens(p.text),
  }));
  const total = breakdown.reduce((s, b) => s + b.tokens, 0);

  // Estimate what the old verbose version would have been (~1.8x multiplier for prose prompts)
  const proseMultiplier = 1.8;
  const estimatedBefore = Math.round(total * proseMultiplier);

  return {
    beforeTokens: estimatedBefore,
    afterTokens: total,
    savings: estimatedBefore - total,
    savingsPercent: `${((1 - total / estimatedBefore) * 100).toFixed(1)}%`,
    breakdown,
  };
}

export function logTokenReport(report: TokenReport): void {
  console.log('=== TOKEN OPTIMIZATION REPORT ===');
  console.log(`Before (estimated prose): ${report.beforeTokens.toLocaleString()} tokens`);
  console.log(`After  (minified YAML):   ${report.afterTokens.toLocaleString()} tokens`);
  console.log(`Savings:                  ${report.savings.toLocaleString()} tokens (${report.savingsPercent})`);
  console.log('--- Breakdown ---');
  for (const b of report.breakdown) {
    console.log(`  ${b.section}: ${b.tokens}`);
  }
  console.log('================================');
}
