import { describe, it, expect } from 'vitest';
import { reporteriaReducer } from './reporteria.reducer';
import { initialReporteriaState } from './reporteria.state';
import {
  enterReport, leaveReport, setReportQuery,
  loadReportList, loadReportListSuccess, loadReportListFailure,
  exportReport, exportReportSuccess, exportReportFailure,
} from './reporteria.actions';

describe('reporteriaReducer', () => {
  it('enterReport resetea el estado y arranca con la query default del reporte', () => {
    const state = reporteriaReducer(
      { ...initialReporteriaState, content: [{ old: true }], error: 'algo viejo' },
      enterReport({ reportId: 'R-PAC-01' }),
    );
    expect(state.reportId).toBe('R-PAC-01');
    expect(state.content).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.query.page).toBe(0);
    expect(state.query.sortField).toBe('apellido');
    expect(state.query.sortDir).toBe('ASC');
    expect(state.loading).toBe(true);
  });

  it('enterReport con un reportId inexistente cae a la query inicial', () => {
    const state = reporteriaReducer(initialReporteriaState, enterReport({ reportId: 'NOPE' }));
    expect(state.query).toEqual(initialReporteriaState.query);
  });

  it('leaveReport vuelve al estado inicial', () => {
    const dirty = { ...initialReporteriaState, reportId: 'R-PAC-01', content: [{ a: 1 }] };
    expect(reporteriaReducer(dirty, leaveReport())).toEqual(initialReporteriaState);
  });

  it('setReportQuery con patch.filters resetea page a 0 (tal como lo pide el caller)', () => {
    const withPage = { ...initialReporteriaState, query: { ...initialReporteriaState.query, page: 3 } };
    const state = reporteriaReducer(withPage, setReportQuery({ patch: { page: 0, filters: { search: 'juan' } } }));
    expect(state.query.page).toBe(0);
    expect(state.query.filters).toEqual({ search: 'juan' });
    expect(state.loading).toBe(true);
  });

  it('setReportQuery sin patch.filters conserva los filtros previos', () => {
    const withFilters = { ...initialReporteriaState, query: { ...initialReporteriaState.query, filters: { search: 'juan' } } };
    const state = reporteriaReducer(withFilters, setReportQuery({ patch: { page: 1, size: 50 } }));
    expect(state.query.filters).toEqual({ search: 'juan' });
    expect(state.query.page).toBe(1);
    expect(state.query.size).toBe(50);
  });

  it('loadReportList marca loading y limpia error', () => {
    const state = reporteriaReducer({ ...initialReporteriaState, error: 'x' }, loadReportList());
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadReportListSuccess carga content/página y apaga loading', () => {
    const page = { content: [{ id: 1 }], page: 2, size: 10, totalElements: 21, totalPages: 3 };
    const state = reporteriaReducer({ ...initialReporteriaState, loading: true }, loadReportListSuccess({ page }));
    expect(state.content).toEqual(page.content);
    expect(state.totalElements).toBe(21);
    expect(state.totalPages).toBe(3);
    expect(state.query.page).toBe(2);
    expect(state.query.size).toBe(10);
    expect(state.loading).toBe(false);
  });

  it('loadReportListFailure limpia content y setea error', () => {
    const state = reporteriaReducer(
      { ...initialReporteriaState, content: [{ a: 1 }], loading: true },
      loadReportListFailure({ error: 'falló' }),
    );
    expect(state.content).toEqual([]);
    expect(state.error).toBe('falló');
    expect(state.loading).toBe(false);
  });

  it('exportReport/Success/Failure gobiernan el flag exporting', () => {
    let state = reporteriaReducer(initialReporteriaState, exportReport({ format: 'csv' }));
    expect(state.exporting).toBe(true);
    expect(state.exportError).toBeNull();

    state = reporteriaReducer(state, exportReportSuccess());
    expect(state.exporting).toBe(false);

    state = reporteriaReducer(state, exportReport({ format: 'xlsx' }));
    state = reporteriaReducer(state, exportReportFailure({ error: 'no se pudo' }));
    expect(state.exporting).toBe(false);
    expect(state.exportError).toBe('no se pudo');
  });
});
