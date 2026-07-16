import { createReducer, on } from '@ngrx/store';
import { defaultReportQuery } from '../models/report.model';
import { findReportById } from '../catalog';
import { initialReporteriaState } from './reporteria.state';
import {
  enterReport, leaveReport, setReportQuery,
  loadReportList, loadReportListSuccess, loadReportListFailure,
  exportReport, exportReportSuccess, exportReportFailure,
} from './reporteria.actions';

export const reporteriaReducer = createReducer(
  initialReporteriaState,

  on(enterReport, (_state, { reportId }) => {
    const def = findReportById(reportId);
    return {
      ...initialReporteriaState,
      reportId,
      query: def ? defaultReportQuery(def) : initialReporteriaState.query,
      loading: true,
    };
  }),

  on(leaveReport, () => initialReporteriaState),

  // Filtro cambia (patch.filters presente) siempre resetea page a 0 desde el
  // componente (ver ReportViewerComponent.onFiltersChange) — el reducer solo
  // aplica el patch tal cual, no reinterpreta la intención del caller.
  on(setReportQuery, (state, { patch }) => ({
    ...state,
    query: {
      ...state.query,
      ...patch,
      filters: patch.filters ?? state.query.filters,
    },
    loading: true,
  })),

  on(loadReportList, (state) => ({ ...state, loading: true, error: null, errorStatus: null })),

  on(loadReportListSuccess, (state, { page }) => ({
    ...state,
    content: page.content,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    totals: page.totals ?? null,
    query: { ...state.query, page: page.page, size: page.size },
    loading: false,
    error: null,
    errorStatus: null,
  })),

  on(loadReportListFailure, (state, { error, status }) => ({
    ...state, loading: false, error, errorStatus: status ?? null, content: [], totals: null,
  })),

  on(exportReport, (state) => ({ ...state, exporting: true, exportError: null })),
  on(exportReportSuccess, (state) => ({ ...state, exporting: false })),
  on(exportReportFailure, (state, { error }) => ({ ...state, exporting: false, exportError: error })),
);
