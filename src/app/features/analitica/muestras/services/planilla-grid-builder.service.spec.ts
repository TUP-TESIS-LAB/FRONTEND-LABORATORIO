import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlanillaGridBuilderService } from './planilla-grid-builder.service';
import { ResultadosApiService } from './resultados-api.service';
import { WorksheetTemplatesApiService } from './worksheet-templates-api.service';
import { PacientesApiService } from './pacientes-api.service';
import type { WorksheetForm } from '../models/worksheet-template.model';

/**
 * KAN-227: el builder DEBE materializar los results de las órdenes derivadas
 * (receiveExternalResult) ANTES de leer los results locales (getResultsByProtocol).
 */
describe('PlanillaGridBuilderService (KAN-227 prep antes de leer)', () => {
  let calls: string[];
  let resultados: {
    receiveExternalResult: ReturnType<typeof vi.fn>;
    getResultsByProtocol: ReturnType<typeof vi.fn>;
    getDeterminations: ReturnType<typeof vi.fn>;
    getDeterminationCatalogByAnalysis: ReturnType<typeof vi.fn>;
  };

  const emptyForm: WorksheetForm = { templateId: 1, templateName: 'Planilla', analyses: [] };

  beforeEach(() => {
    calls = [];
    resultados = {
      receiveExternalResult: vi.fn(() => { calls.push('receiveExternalResult'); return of([]); }),
      getResultsByProtocol: vi.fn(() => { calls.push('getResultsByProtocol'); return of([]); }),
      getDeterminations: vi.fn(() => of([])),
      getDeterminationCatalogByAnalysis: vi.fn(() => of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        PlanillaGridBuilderService,
        { provide: ResultadosApiService, useValue: resultados },
        { provide: WorksheetTemplatesApiService, useValue: { getForm: vi.fn(() => of(emptyForm)) } },
        { provide: PacientesApiService, useValue: { getByIds: vi.fn(() => of([])) } },
      ],
    });
  });

  it('llama receiveExternalResult ANTES de getResultsByProtocol', () => {
    const service = TestBed.inject(PlanillaGridBuilderService);
    let done = false;
    service.build(1, [10, 20]).subscribe(() => { done = true; });

    expect(done).toBe(true);
    expect(resultados.receiveExternalResult).toHaveBeenCalledWith([10, 20]);
    expect(resultados.getResultsByProtocol).toHaveBeenCalledTimes(2);
    // orden: el prep$ dispara primero, luego los reads por protocolo
    expect(calls[0]).toBe('receiveExternalResult');
    expect(calls.slice(1)).toEqual(['getResultsByProtocol', 'getResultsByProtocol']);
  });

  it('no llama receiveExternalResult cuando no hay protocolos y aun asi arma la grilla', () => {
    const service = TestBed.inject(PlanillaGridBuilderService);
    let grid: unknown = null;
    service.build(1, []).subscribe(g => { grid = g; });

    expect(resultados.receiveExternalResult).not.toHaveBeenCalled();
    expect(resultados.getResultsByProtocol).not.toHaveBeenCalled();
    expect(grid).not.toBeNull();
  });

  it('si receiveExternalResult falla, igual lee los results locales (no rompe la carga)', () => {
    resultados.receiveExternalResult = vi.fn(() => { calls.push('receiveExternalResult'); return throwError(() => new Error('boom-net')); });
    TestBed.overrideProvider(ResultadosApiService, { useValue: resultados });

    const service = TestBed.inject(PlanillaGridBuilderService);
    let grid: unknown = null;
    let errored = false;
    service.build(1, [10]).subscribe({ next: g => { grid = g; }, error: () => { errored = true; } });

    expect(errored).toBe(false);
    expect(resultados.getResultsByProtocol).toHaveBeenCalledWith(10);
    expect(grid).not.toBeNull();
  });
});
