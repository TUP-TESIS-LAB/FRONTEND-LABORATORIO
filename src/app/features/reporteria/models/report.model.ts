import { TableColumn } from '@shared/ui/models/table-column.model';

/**
 * Tipos de filtro soportados por `ReportFiltersComponent`. `dateRange` se deja
 * declarado por si algún reporte futuro necesita un SEGUNDO rango de fechas
 * propio (ej. "fecha de resultado" además del rango universal) — ningún
 * reporte del catálogo actual lo usa: los 12 reportes cubren su filtro de
 * fecha con el rango universal (`dateFrom`/`dateTo`, ver `ReportQuery`).
 */
export type ReportFilterType = 'text' | 'select' | 'boolean' | 'number' | 'dateRange';

export interface ReportFilterOption {
  label: string;
  value: unknown;
}

export interface ReportFilterDef {
  /** Clave del query param que espera el backend para este filtro. */
  key: string;
  label: string;
  type: ReportFilterType;
  /** Solo aplica a type: 'select'. Estático, fijado en el catálogo (ej. sexo, estado). */
  options?: ReportFilterOption[];
  /**
   * Solo aplica a type: 'select'. Cuando las opciones no se conocen en build-time (ej.
   * "plan" — depende del tenant), el catálogo declara esta clave y el contenedor
   * (`ReportPage`) resuelve las opciones reales en runtime (mismo patrón que
   * `branchOptions`) y las pasa como `dynamicOptions[dynamicOptionsKey]`. Tiene
   * prioridad sobre `options` cuando ambos están presentes.
   */
  dynamicOptionsKey?: string;
}

/** Tipo semántico de una columna — determina qué template `uiCell` usa `ReportViewerComponent`. */
export type ReportColumnType = 'boolean' | 'date' | 'variation';

export interface ReportColumn extends TableColumn {
  /** Sin declarar, se trata como texto/número plano (guión si el valor es null/undefined/''). */
  type?: ReportColumnType;
}

/**
 * Columna de variación sintetizada por `ReportViewerComponent` (no vive en `columns`)
 * para los reportes de serie temporal (D3/D4 del spec). El backend calcula la variación
 * % de cada fila contra el bucket anterior y la agrega como campo plano en cada row.
 *
 * Un reporte puede tener MÁS DE UNA (ej. R-EMP-02 trae `variacionAltas` y
 * `variacionBajas` porque cuenta dos métricas, no una) — por eso `ReportDef.variation`
 * es un array, no un objeto único.
 */
export interface ReportVariationDef {
  /** Nombre del campo que trae la variación en cada fila del content. */
  field: string;
  header?: string;
}

export interface ReportDef {
  /** Código del reporte, ej. 'R-PAC-01'. Se usa como :reportId en la ruta. */
  id: string;
  title: string;
  description: string;
  /** Ruta base del listado, ej. '/api/v1/analitica/reportes/pacientes/listado'. El export cuelga de `${endpoint}/export`. */
  endpoint: string;
  /** Roles habilitados — espeja el @PreAuthorize del backend. */
  roles: string[];
  columns: readonly ReportColumn[];
  /** Whitelist de campos ordenables — espeja la whitelist del backend. */
  sortableFields: readonly string[];
  defaultSort?: { field: string; direction: 'ASC' | 'DESC' };
  /**
   * Nombre del query param de búsqueda de texto que espera ESTE reporte. El backend
   * es inconsistente: pacientes y usuarios usan `search`; médicos, empleados y
   * sucursales usan `busqueda`. Default: `'search'`. `null` oculta la caja de búsqueda
   * en reportes que no la soportan (ej. altas-por-período).
   */
  searchKey?: string | null;
  /**
   * Rango de fechas propio del reporte, con los nombres de param que espera el backend.
   * Solo se renderiza el selector de fechas si el reporte lo declara — ningún listado
   * del catálogo actual expone rango de fechas, así que por defecto no se muestra.
   */
  dateRange?: { fromKey: string; toKey: string };
  /**
   * Filtros propios del reporte (por su `key` = query param del backend), más el
   * `branchId` (sucursal) que resuelve `ReportFiltersComponent` cuando hay sucursales.
   */
  filters: readonly ReportFilterDef[];
  /**
   * Opt-in: `true` SOLO en los reportes cuyo backend acepta `branchId` (D2.1/D2.3 del
   * spec). Hoy son cuatro: R-PAC-02, R-PAC-03, R-PAC-04, R-PAC-05 — todos vía join
   * contra `AttentionJpaEntity` (`patientId` + `branchId`).
   *
   * El default es ausente/`false` a propósito. El padrón no está atado a sucursales —
   * `Doctor`, `Employee` y `User` no tienen `branch_id` ni relación indirecta viable
   * (D2.2: el puerto `UserBranchAccessPort` resuelve user→branches, no branch→users, y
   * construir la vía inversa cruzaría entidades JPA entre módulos) — así que un selector
   * de sucursal en cualquier otro reporte se renderiza, filtra, y el backend lo ignora:
   * el usuario cree que filtró y no filtró nada. Olvidarse de este flag tiene que dejar
   * el filtro ESCONDIDO, no mintiendo.
   */
  branchFilterable?: boolean;
  /**
   * Solo en la familia "serie temporal" (D3/D4): agrega una columna de variación % por
   * cada entrada. La mayoría de los reportes trae una sola métrica (un elemento); R-EMP-02
   * y R-USR-03 traen más de una porque cuentan varios eventos en la misma fila.
   */
  variation?: readonly ReportVariationDef[];
}

export interface ReportGroup {
  key: string;
  label: string;
  reports: ReportDef[];
}

export interface ReportPageResponse<T = Record<string, unknown>> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  /**
   * Suma de la métrica (no el conteo de filas) para los reportes agregados (D5 del
   * spec). `null`/ausente en los reportes que no la calculan — la UI no renderiza
   * la fila de totales en ese caso.
   */
  totals?: Record<string, unknown> | null;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

/**
 * Estado de query de un reporte en pantalla. `filters` es un bag plano que
 * incluye TANTO los filtros universales (search/dateFrom/dateTo/branchId)
 * COMO los filtros propios del reporte (por su `key`) — `ReportesApiService`
 * los serializa a query params de la misma forma, sin distinguir origen.
 */
export interface ReportQuery {
  page: number;
  size: number;
  sortField: string;
  sortDir: 'ASC' | 'DESC';
  filters: Record<string, unknown>;
}

export const DEFAULT_REPORT_PAGE_SIZE = 20;

export function defaultReportQuery(def: ReportDef): ReportQuery {
  return {
    page: 0,
    size: DEFAULT_REPORT_PAGE_SIZE,
    sortField: def.defaultSort?.field ?? def.sortableFields[0] ?? 'id',
    sortDir: def.defaultSort?.direction ?? 'ASC',
    filters: {},
  };
}

/** Marca como `sortable` las columnas cuyo `field` está en la whitelist del reporte. */
export function withSortableColumns<T extends TableColumn>(
  columns: readonly T[],
  sortableFields: readonly string[],
): T[] {
  return columns.map((c) => (sortableFields.includes(c.field) ? { ...c, sortable: true } : c));
}
