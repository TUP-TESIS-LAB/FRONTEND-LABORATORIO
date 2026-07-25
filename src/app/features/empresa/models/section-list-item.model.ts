/**
 * Sucursal (branch) que usa una sección, en la forma reducida que devuelve
 * `GET /api/v1/sucursales/sections` (chip en la tabla de Secciones).
 */
export interface BranchTag {
  id: number;
  code: string;
  name: string;
}

/**
 * Ítem del listado de secciones enriquecido con las sucursales que la usan.
 * Superset de `Section` (sucursales) — agrega `branches`.
 */
export interface SectionListItem {
  id: number;
  name: string;
  active: boolean;
  branches: BranchTag[];
}

/**
 * Ítem de sección con el conteo de análisis mergeado desde analitica
 * (`countMap[id] ?? 0`). Lo produce el selector `selectSeccionesConCount`.
 */
export interface SectionListItemWithCount extends SectionListItem {
  analysisCount: number;
}
