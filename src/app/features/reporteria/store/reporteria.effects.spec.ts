import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ReporteriaEffects } from './reporteria.effects';
import { ReportesApiService } from '../services/reportes-api.service';
import { REPORTERIA_FEATURE_KEY, initialReporteriaState, ReporteriaState } from './reporteria.state';
import {
  enterReport, setReportQuery, loadReportListSuccess, loadReportListFailure,
  exportReport, exportReportSuccess, exportReportFailure,
} from './reporteria.actions';

describe('ReporteriaEffects', () => {
  let actions$: Observable<unknown>;
  let api: { list: ReturnType<typeof vi.fn>; export: ReturnType<typeof vi.fn> };

  function make(action: unknown, stateOverrides: Partial<ReporteriaState> = {}) {
    actions$ = of(action);
    TestBed.configureTestingModule({
      providers: [
        ReporteriaEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: { [REPORTERIA_FEATURE_KEY]: { ...initialReporteriaState, ...stateOverrides } },
        }),
        { provide: ReportesApiService, useValue: api },
        MessageService,
      ],
    });
    TestBed.inject(MockStore);
    return TestBed.inject(ReporteriaEffects);
  }

  beforeEach(() => {
    api = { list: vi.fn(), export: vi.fn() };
  });

  it('loadOnQueryChange$ carga el reporte usando la query vigente en el store', async () => {
    const page = { content: [{ id: 1 }], page: 0, size: 20, totalElements: 1, totalPages: 1 };
    api.list.mockReturnValue(of(page));
    const eff = make(enterReport({ reportId: 'R-PAC-01' }), { reportId: 'R-PAC-01' });
    const out = await new Promise((r) => eff.loadOnQueryChange$.subscribe(r));
    expect(out).toEqual(loadReportListSuccess({ page }));
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list.mock.calls[0][0]).toMatchObject({ id: 'R-PAC-01' });
  });

  it('loadOnQueryChange$ emite Failure si el reportId no existe en el catálogo', async () => {
    const eff = make(enterReport({ reportId: 'INEXISTENTE' }), { reportId: 'INEXISTENTE' });
    const out = await new Promise((r) => eff.loadOnQueryChange$.subscribe(r));
    expect((out as { type: string }).type).toBe(loadReportListFailure.type);
    expect(api.list).not.toHaveBeenCalled();
  });

  it('loadOnQueryChange$ emite Failure en español si la API falla', async () => {
    api.list.mockReturnValue(throwError(() => new Error('boom')));
    const eff = make(setReportQuery({ patch: { page: 1 } }), {
      reportId: 'R-PAC-01',
      query: { ...initialReporteriaState.query, page: 1 },
    });
    const out = await new Promise((r) => eff.loadOnQueryChange$.subscribe(r));
    expect(out).toEqual(loadReportListFailure({ error: 'No se pudo cargar el reporte. Probá de nuevo.' }));
  });

  it('export$ usa los filtros VIGENTES en el store al momento del click, no unos vacíos', async () => {
    const createUrl = vi.fn(() => 'blob:url');
    const revokeUrl = vi.fn();
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.createObjectURL = createUrl;
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.revokeObjectURL = revokeUrl;
    const click = vi.fn();
    const anchor = { href: '', download: '', click, remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);

    const res = new HttpResponse<Blob>({
      body: new Blob(['x']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="reporte.csv"' }),
    });
    api.export.mockReturnValue(of(res));

    const filters = { search: 'juan', dateFrom: '2026-01-01' };
    const eff = make(exportReport({ format: 'csv' }), {
      reportId: 'R-PAC-01',
      query: { ...initialReporteriaState.query, filters },
    });
    const out = await new Promise((r) => eff.export$.subscribe(r));

    expect(out).toEqual(exportReportSuccess());
    expect(api.export).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'R-PAC-01' }),
      'csv',
      expect.objectContaining({ filters }),
    );
    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('reporte.csv');
    vi.restoreAllMocks();
  });

  it('export$ emite Failure en español si la API falla', async () => {
    api.export.mockReturnValue(throwError(() => new Error('boom')));
    const eff = make(exportReport({ format: 'pdf' }), { reportId: 'R-PAC-01' });
    const out = await new Promise((r) => eff.export$.subscribe(r));
    expect(out).toEqual(exportReportFailure({ error: 'No se pudo exportar el reporte. Probá de nuevo.' }));
  });

  it('loadOnQueryChange$ mapea un 403 del back a un mensaje de permiso, con status', async () => {
    api.list.mockReturnValue(throwError(() => ({ status: 403, error: { message: 'Access Denied' } })));
    const eff = make(enterReport({ reportId: 'R-PAC-01' }), { reportId: 'R-PAC-01' });
    const out = await new Promise((r) => eff.loadOnQueryChange$.subscribe(r));
    expect(out).toEqual(loadReportListFailure({ error: 'No tenés permiso para ver este reporte.', status: 403 }));
  });

  it('showExportError$ muestra el error de export como toast — antes era un fallo 100% silencioso', async () => {
    const eff = make(exportReportFailure({ error: 'No se pudo exportar el reporte. Probá de nuevo.' }));
    const messageService = TestBed.inject(MessageService);
    const addSpy = vi.spyOn(messageService, 'add');
    await new Promise((r) => eff.showExportError$.subscribe(r));
    expect(addSpy).toHaveBeenCalledWith({
      severity: 'error', summary: 'Error', detail: 'No se pudo exportar el reporte. Probá de nuevo.',
    });
  });
});
