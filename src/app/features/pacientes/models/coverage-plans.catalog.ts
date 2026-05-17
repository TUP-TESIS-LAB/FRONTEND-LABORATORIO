// src/app/features/pacientes/models/coverage-plans.catalog.ts
export interface CoveragePlanOption {
  planId: number;
  label: string;
}

/**
 * Local stub until the backend exposes a coverage-plans catalog endpoint.
 * Backend MUST have rows with these planIds seeded before alta with cobertura works.
 */
export const COVERAGE_PLAN_CATALOG: readonly CoveragePlanOption[] = [
  { planId: 1, label: 'Particular' },
  { planId: 2, label: 'OSDE 210' },
  { planId: 3, label: 'OSDE 310' },
  { planId: 4, label: 'Swiss Medical' },
  { planId: 5, label: 'PAMI' },
  { planId: 6, label: 'IOMA' },
  { planId: 7, label: 'Galeno' },
];

export const COVERAGE_PLAN_BY_ID: ReadonlyMap<number, CoveragePlanOption> = new Map(
  COVERAGE_PLAN_CATALOG.map((p) => [p.planId, p]),
);

export function getCoveragePlanLabel(planId: number | undefined | null): string {
  if (planId == null) return '—';
  return COVERAGE_PLAN_BY_ID.get(planId)?.label ?? `Plan #${planId}`;
}
