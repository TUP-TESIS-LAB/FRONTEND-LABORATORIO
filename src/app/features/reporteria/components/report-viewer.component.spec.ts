import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ReportViewerComponent, resolveLazyLoadPatch } from './report-viewer.component';
import { ReportDef, ReportQuery } from '../models/report.model';

/**
 * La lógica de traducción del evento de tabla (`onLazyLoad`) vive en la función pura
 * `resolveLazyLoadPatch`, y se testea directamente — sin depender del binding de `input()`,
 * que en el entorno de vitest del proyecto no propaga valores de forma confiable (misma NOTE
 * que `metric-filter-bar.component.spec.ts`). Los métodos que solo emiten outputs
 * (`onFiltersChange`/`onExport`) sí se ejercitan sobre la instancia, porque no leen inputs.
 */
describe('ReportViewerComponent', () => {
  const def: ReportDef = {
    id: 'R-TEST-01',
    title: 'Reporte de prueba',
    description: 'desc',
    endpoint: '/api/v1/test',
    roles: ['ADMINISTRADOR'],
    sortableFields: ['name', 'createdAt'],
    defaultSort: { field: 'name', direction: 'ASC' },
    filters: [],
    columns: [{ field: 'name', header: 'Nombre' }],
  };

  const query: ReportQuery = { page: 0, size: 20, sortField: 'name', sortDir: 'ASC', filters: { search: 'juan' } };

  function create() {
    const fixture = TestBed.createComponent(ReportViewerComponent);
    fixture.componentRef.setInput('def', def);
    fixture.componentRef.setInput('query', query);
    return fixture.componentInstance;
  }

  let cmp: ReportViewerComponent;

  beforeEach(() => {
    cmp = create();
  });

  it('resolveLazyLoadPatch traduce first/rows a page/size y respeta sort del evento', () => {
    const patch = resolveLazyLoadPatch({ first: 40, rows: 20, sortField: 'createdAt', sortOrder: -1 }, query);

    expect(patch).toEqual({ page: 2, size: 20, sortField: 'createdAt', sortDir: 'DESC' });
  });

  it('resolveLazyLoadPatch sin sortField/sortOrder conserva el sort actual de la query', () => {
    // Paginar sin reordenar: el evento no trae sort → se conserva el vigente. Bug clásico
    // sería resetear el orden a default al cambiar de página.
    const patch = resolveLazyLoadPatch({ first: 0, rows: 20 }, query);

    expect(patch).toEqual({ page: 0, size: 20, sortField: 'name', sortDir: 'ASC' });
  });

  it('onFiltersChange SIEMPRE resetea a página 0 — bug clásico: quedarse en una página que ya no existe', () => {
    let emitted: Partial<ReportQuery> | undefined;
    cmp.queryPatch.subscribe((p) => (emitted = p));

    cmp.onFiltersChange({ search: 'pedro', dateFrom: '2026-01-01' });

    expect(emitted).toEqual({ page: 0, filters: { search: 'pedro', dateFrom: '2026-01-01' } });
  });

  it('onExport emite el formato elegido — el export se arma en el efecto con la query VIGENTE del store', () => {
    // El componente NO recibe la query en el evento de export: solo emite el formato. El
    // efecto NgRx toma la query vigente del store al armar la request, así que el export
    // sale siempre con los filtros actualmente aplicados (no con filtros vacíos).
    let emittedFormat: string | undefined;
    cmp.exportFormat.subscribe((f) => (emittedFormat = f));

    cmp.onExport('xlsx');

    expect(emittedFormat).toBe('xlsx');
  });

  it('onExport con cada formato soportado', () => {
    const formats: string[] = [];
    cmp.exportFormat.subscribe((f) => formats.push(f));
    cmp.onExport('csv');
    cmp.onExport('xlsx');
    cmp.onExport('pdf');
    expect(formats).toEqual(['csv', 'xlsx', 'pdf']);
  });

  // NOTE: `setInput()` no propaga en este entorno de vitest (confirmado: incluso para
  // inputs NO required, ver hallazgo en engram) — solo se puede validar el default.
  // El caso errorStatus===403 → canRetry false queda cubierto por inspección de código
  // y por QA manual/E2E (navegar a un reporte sin permiso y confirmar que no aparece
  // "Reintentar"), no por unit test.
  it('canRetry es true por default (sin errorStatus) — un error transitorio sí es reintentable', () => {
    expect((cmp as unknown as { canRetry(): boolean }).canRetry()).toBe(true);
  });
});
