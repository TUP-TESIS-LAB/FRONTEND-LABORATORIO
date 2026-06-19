/** Versión del nomenclador NBU. MOCK — PR #97 expone NbuVersion/NbuVersionDetail reales. */
export interface NbuVersion {
  id: string;
  label: string;
  vigente: boolean;
}

/** Fila del catálogo de análisis. Campos reales (AnalysisService) + cantidadUb (real hoy, por-versión con #97). */
export interface CatalogRow {
  id: number;
  shortCode: string;
  name: string;
  familyName: string | null;
  nbuCode: string | null;
  cantidadUb: number | null;
}

/** Determinación de un análisis. Real (AnalysisDetail.determinations: id + name). */
export interface Determination {
  id: number;
  name: string;
}

/** Config de precio particular del laboratorio. MOCK — coverages (no en PR #97). */
export interface ParticularPricing {
  valorUb: number;
  overrides: Record<number, number>; // analysisId -> precio manual
}

/**
 * Factor mock por versión. MOCK — PR #97: saldrá de NbuVersionDetail real.
 * Expuesto como constante pura para que pueda usarse en selectores sin DI.
 */
export const NBU_VERSION_FACTOR: Record<string, number> = {
  v2024: 1,
  v2021: 0.85,
  v2018: 0.7,
};

/**
 * Función pura standalone: ajusta la cantidad de U.B. base según la versión del nomenclador.
 * Equivalente a NomencladorService.cantidadUbForVersion pero sin DI, usable en selectores.
 * MOCK — PR #97: la cantidad real saldrá de NbuVersionDetail por (práctica, versión).
 */
export function cantidadUbParaVersion(base: number | null, versionId: string): number | null {
  if (base == null) return null;
  const f = NBU_VERSION_FACTOR[versionId] ?? 1;
  return Math.round(base * f * 100) / 100;
}
