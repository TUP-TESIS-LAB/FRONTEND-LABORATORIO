// src/app/features/pacientes/models/coverage-plans.catalog.ts
export interface CoveragePlanOption {
  planId: number;
  label: string;
  particular?: boolean;
}

/**
 * Pure helper: looks up the label for a planId within a provided plans list.
 * Returns '—' for null/undefined planId, and 'Plan #N' when the id is not found.
 */
export function getCoveragePlanLabel(
  planId: number | null | undefined,
  plans: readonly CoveragePlanOption[],
): string {
  if (planId == null) return '—';
  return plans.find((p) => p.planId === planId)?.label ?? `Plan #${planId}`;
}
