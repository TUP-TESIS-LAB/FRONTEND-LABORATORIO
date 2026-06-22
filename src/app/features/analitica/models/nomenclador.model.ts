/** Versión del nomenclador NBU. REAL — GET /api/v1/analitica/nbu-versions (PR #97). */
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

/** Config de precio particular del laboratorio. MOCK — sin endpoint BE todavía (feature futura). */
export interface ParticularPricing {
  valorUb: number;
  overrides: Record<number, number>; // analysisId -> precio manual
}

/**
 * Función pura standalone: cantidad de U.B. base para la versión del nomenclador, usable en selectores.
 * Passthrough HOY: el backend devuelve la cantidadUb global de analysis_catalog y todavía NO resuelve
 * la cantidad por versión (nbu_version_details existe pero la búsqueda no lo aplica). Cuando el BE
 * implemente la resolución por versión, mapear la cantidad correcta por (análisis, versión) acá.
 */
export function cantidadUbParaVersion(base: number | null, _versionId: string): number | null {
  return base;
}
