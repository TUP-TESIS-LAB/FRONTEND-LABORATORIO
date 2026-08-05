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

/**
 * Resumen de la configuración por tenant de un análisis, mostrado en el quick-view
 * (bloque CONFIGURACIÓN) al expandir la fila del catálogo NBU.
 * No incluye última modificación: el BE no expone updatedBy/updatedAt (diferido).
 */
export interface ConfigResumen {
  tenantAnalysisId: number | null;
  sectionId: number | null;
  sectionName: string | null;
  customName: string | null;     // nombre propio del tenant_analysis (alias del laboratorio)
  active: boolean;
  hasCustomConfig: boolean;      // hay override y/o ref-values propios
}

/** Config de precio particular del laboratorio (valor U.B. + overrides por análisis). */
export interface ParticularPricing {
  valorUb: number;
  overrides: Record<number, number>; // analysisId -> precio manual
}

/**
 * Función pura standalone: versión que debe quedar preseleccionada al abrir el Nomenclador.
 *
 * Reglas, en orden (explícitas a propósito — el default acá tiene impacto de negocio: el operador
 * que no toca el selector lee las cantidades de U.B. de la versión que elijamos, y cotizar con un
 * nomenclador viejo produce un precio mal calculado):
 *
 *  1. La versión vigente (`active` en el backend). Es el caso normal y el único deseable.
 *  2. Ninguna vigente (dato incompleto del backend): la de mayor id. El id es autoincremental,
 *     así que el mayor corresponde a la versión cargada más recientemente. Se elige por id y no
 *     por posición en el array para no depender del orden en que responda el backend, y NUNCA
 *     `versions[0]`: la primera es la MÁS VIEJA, que es justo el peor default posible.
 *  3. Lista vacía: `null`. La pantalla no se rompe; el selector muestra su placeholder.
 */
export function resolveDefaultVersionId(versions: readonly NbuVersion[]): string | null {
  const vigente = versions.find(v => v.vigente);
  if (vigente) return vigente.id;

  if (versions.length === 0) return null;

  // Sin vigente: la más nueva por id. Los ids no numéricos caen al final del criterio
  // (Number.NaN nunca gana la comparación) y en ese caso queda la última recorrida.
  return versions.reduce((masNueva, v) =>
    (Number(v.id) > Number(masNueva.id) ? v : masNueva),
  ).id;
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
