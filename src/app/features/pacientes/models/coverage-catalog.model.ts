// Catálogo de coberturas para la cascada Obra Social → Plan (Diseño B del Paso 2).
// "Particular" = sin obra social (planId nulo): no es una fila del catálogo, se ofrece aparte.

export type InsurerType = 'SOCIAL' | 'PRIVATE';

export interface InsurerOption {
  id: number;
  name: string;
  acronym: string;
  /** "SIGLA — Nombre", precomputado para optionLabel/filterBy de los <p-select> (KAN-246). */
  displayLabel: string;
  insurerType: InsurerType;
}

export interface PlanOption {
  planId: number;
  insurerId: number;
  name: string;
}

export interface CoverageCatalog {
  insurers: readonly InsurerOption[];
  plans: readonly PlanOption[];
}

export const EMPTY_CATALOG: CoverageCatalog = { insurers: [], plans: [] };

/** Obras sociales seleccionables en la cascada (todas; "Particular" = sin OS, se ofrece aparte). */
export function selectableInsurers(cat: CoverageCatalog): InsurerOption[] {
  return [...cat.insurers];
}

/** Planes activos de una obra social. */
export function plansForInsurer(cat: CoverageCatalog, insurerId: number | null): PlanOption[] {
  if (insurerId == null) return [];
  return cat.plans.filter((p) => p.insurerId === insurerId);
}

/** Plan por id. */
export function planById(cat: CoverageCatalog, planId: number | null | undefined): PlanOption | null {
  if (planId == null) return null;
  return cat.plans.find((p) => p.planId === planId) ?? null;
}

/** Nombre del plan (fallback "Plan #N"). */
export function planName(cat: CoverageCatalog, planId: number | null | undefined): string {
  const p = planById(cat, planId);
  if (!p) return planId == null ? '—' : `Plan #${planId}`;
  return p.name;
}

/** Nombre de la obra social a la que pertenece un plan ("—" si el plan no existe). */
export function insurerNameForPlan(cat: CoverageCatalog, planId: number | null | undefined): string {
  const p = planById(cat, planId);
  if (!p) return '—';
  return cat.insurers.find((i) => i.id === p.insurerId)?.name ?? '—';
}
