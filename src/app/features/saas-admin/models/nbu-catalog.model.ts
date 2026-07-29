// KAN-257: catálogo NBU maestro activable por tenant desde SaaS Admin.

/** Resumen del catálogo NBU de un tenant: activos del tenant vs total del catálogo maestro. */
export interface NbuCatalogSummary {
  activeCount: number;
  catalogTotal: number;
}

/** Resultado de una acción masiva (activar/desactivar todo): cuántos análisis se afectaron. */
export interface NbuCatalogBulkResult {
  count: number;
}
