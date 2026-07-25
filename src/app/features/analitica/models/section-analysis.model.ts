/**
 * Análisis asignado a una sección — respuesta de
 * `GET /api/v1/analitica/section-assignments/{sectionId}`.
 */
export interface SectionAnalysis {
  analysisId: number;
  name: string;
  shortCode: string;
}

/**
 * Resultado de resolver un nombre pegado contra el catálogo del tenant —
 * respuesta de `POST /api/v1/analitica/analysis/resolve`.
 * `matched=false` ⇒ `analysisId=null` (no existe en el tenant).
 */
export interface ResolvedAnalysis {
  name: string;
  analysisId: number | null;
  matched: boolean;
}
