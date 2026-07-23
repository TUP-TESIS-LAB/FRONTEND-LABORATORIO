import { ReportQuery } from '../models/report.model';

export const REPORTERIA_FEATURE_KEY = 'reporteria';

export interface ReporteriaState {
  reportId: string | null;
  query: ReportQuery;
  content: readonly unknown[];
  totalElements: number;
  totalPages: number;
  /** Suma de la métrica por columna (D5) — null cuando el reporte no la calcula. */
  totals: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  /** HTTP status del último error de carga (ej. 403) — null si no aplica o no hubo error. */
  errorStatus: number | null;
  exporting: boolean;
  exportError: string | null;
}

export const initialReporteriaState: ReporteriaState = {
  reportId: null,
  query: { page: 0, size: 20, sortField: 'id', sortDir: 'ASC', filters: {} },
  content: [],
  totalElements: 0,
  totalPages: 0,
  totals: null,
  loading: false,
  error: null,
  errorStatus: null,
  exporting: false,
  exportError: null,
};
