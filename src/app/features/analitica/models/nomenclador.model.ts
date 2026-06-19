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
