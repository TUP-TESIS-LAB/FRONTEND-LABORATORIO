// Catálogo de coberturas para la cascada Obra Social → Plan (Diseño B del Paso 2).
// "Particular" = insurer SELF_PAY; se trata aparte (fila fija, no es una OS seleccionable).

export type InsurerType = 'SOCIAL' | 'PRIVATE' | 'SELF_PAY';

export interface InsurerOption {
  id: number;
  name: string;
  insurerType: InsurerType;
}

export interface PlanOption {
  planId: number;
  insurerId: number;
  name: string;
  particular: boolean;
}

export interface CoverageCatalog {
  insurers: readonly InsurerOption[];
  plans: readonly PlanOption[];
}

export const EMPTY_CATALOG: CoverageCatalog = { insurers: [], plans: [] };

/** Obras sociales seleccionables en la cascada: todo lo que NO es Particular (SELF_PAY). */
export function selectableInsurers(cat: CoverageCatalog): InsurerOption[] {
  return cat.insurers.filter((i) => i.insurerType !== 'SELF_PAY');
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

/** Nombre de la obra social a la que pertenece un plan (Particular si es SELF_PAY). */
export function insurerNameForPlan(cat: CoverageCatalog, planId: number | null | undefined): string {
  const p = planById(cat, planId);
  if (!p) return '—';
  if (p.particular) return 'Particular';
  return cat.insurers.find((i) => i.id === p.insurerId)?.name ?? '—';
}
