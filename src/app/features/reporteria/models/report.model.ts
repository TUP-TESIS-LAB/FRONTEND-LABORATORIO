import { TableColumn } from '@shared/ui/models/table-column.model';

/**
 * Tipos de filtro soportados por `ReportFiltersComponent`. `dateRange` se deja
 * declarado por si algún reporte futuro necesita un SEGUNDO rango de fechas
 * propio (ej. "fecha de resultado" además del rango universal) — ningún
 * reporte del catálogo actual lo usa: los 17 reportes cubren su filtro de
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
  /** Solo aplica a type: 'select'. */
  options?: ReportFilterOption[];
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
  columns: readonly TableColumn[];
  /** Whitelist de campos ordenables — espeja la whitelist del backend. */
  sortableFields: readonly string[];
  defaultSort?: { field: string; direction: 'ASC' | 'DESC' };
  /**
   * Filtros propios del reporte, más allá de los universales que ya resuelve
   * `ReportFiltersComponent` para TODOS los reportes: `search` (texto libre),
   * `dateFrom`/`dateTo` (rango de fecha) y `branchId` (sucursal).
   */
  filters: readonly ReportFilterDef[];
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
export function withSortableColumns(
  columns: readonly TableColumn[],
  sortableFields: readonly string[],
): TableColumn[] {
  return columns.map((c) => (sortableFields.includes(c.field) ? { ...c, sortable: true } : c));
}
