/**
 * Chip de análisis dentro del editor de asignaciones de una sección.
 * `notfound` = nombre pegado que no matcheó ningún análisis del tenant
 * (se renderiza como error, sin `analysisId`).
 */
export interface AnalysisChip {
  analysisId: number | null;
  name: string;
  state: 'found' | 'notfound';
}
