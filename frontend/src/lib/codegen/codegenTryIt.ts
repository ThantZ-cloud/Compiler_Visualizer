import type { CodeGenerationData } from '../../types';
import { buildTacFromJava } from './tacParser';

// ---------------------------------------------------------------------------
// Per-step presets — each step shows textbook-grounded examples
// ---------------------------------------------------------------------------

export const CODEGEN_TRYIT_PRESETS = [
  'int a = b * 2 + c * d;',
  'int x = a + b * c;',
  'if (a > 10) a = a - 1;',
  'int s = 0; for (int i=0;i<n;i++) s += a[i];',
] as const;

/** Step 0 — TAC Generation (expression decomposition) */
export const TRYIT_STEP0_PRESETS = [
  'int a = b * 2 + c * d;',
  'int x = (a + b) * (c - d);',
  'int y = a + b * c;',
  'int r = 10 * fact(n - 1);',
] as const;

/** Step 1 — Dependence Graph (RAW/WAR/WAW) */
export const TRYIT_STEP1_PRESETS = [
  'int a = 1; int b = a + 2; int c = b * 3;',
  'int a = 1; int b = 2; int c = a + b; int d = a * b;',
  'int x = 1; x = x + 1;',
] as const;

/** Step 2 — List Scheduling (parallelism showcase) */
export const TRYIT_STEP2_PRESETS = [
  'int a = b + c; int d = e * f; int g = a + d;',
  'int x = a * b; int y = c * d; int z = x + y;',
  'int p = a + 1; int q = b + 2; int r = p + q;',
] as const;

/** Step 3 — Interference Graph (liveness) */
export const TRYIT_STEP3_PRESETS = [
  'int a = 1; int b = 2; int c = a + b;',
  'int x = 1; int y = x + 2; x = y + 3;',
  'int a = 1; int b = a + 1; int c = b + 1; int d = c + 1;',
] as const;

/** Step 4 — Graph Coloring (spills) */
export const TRYIT_STEP4_PRESETS = [
  'int a = 1; int b = 2; int c = 3; int d = a + b + c;',
  'int x = 1; int y = 2; int z = x + y;',
  'int a = 1; int b = a + 1; int c = b + 1; int d = c + 1; int e = d + 1;',
] as const;

export const ALL_TRYIT_PRESETS_BY_STEP: readonly (readonly string[])[] = [
  TRYIT_STEP0_PRESETS,
  TRYIT_STEP1_PRESETS,
  TRYIT_STEP2_PRESETS,
  TRYIT_STEP3_PRESETS,
  TRYIT_STEP4_PRESETS,
];

// ---------------------------------------------------------------------------
// Main builder — delegates to tacParser for any input
// ---------------------------------------------------------------------------

export function buildCodegenTryItData(code: string): CodeGenerationData {
  try {
    return buildTacFromJava(code);
  } catch {
    // Fallback: return minimal data on parse failure
    return buildTacFromJava('int x = 1;');
  }
}
