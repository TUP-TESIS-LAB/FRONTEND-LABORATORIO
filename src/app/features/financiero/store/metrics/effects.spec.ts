import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { NOT_MODIFIED } from '@core/refresh/polling-context';
import { FinancieroMetricsEffects } from './effects';
import { FinancieroMetricsApiService } from '../../services/financiero-metrics-api.service';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';
import {
  loadFinancieroMetricsDashboard,
  loadRecaudacionKpis, loadRecaudacionKpisSuccess, loadRecaudacionKpisNotModified, loadRecaudacionKpisFailure,
  loadRecaudacionSerie,
  loadRecaudacionPorMetodo,
  loadRecaudacionPorSucursal, loadRecaudacionPorSucursalSuccess, loadRecaudacionPorSucursalNotModified, loadRecaudacionPorSucursalFailure,
  loadFacturacionKpis,
  loadFacturacionPorCobertura,
  loadLiquidacionesKpis,
  loadLiquidacionesPorObraSocial,
  loadCajaKpis,
  loadCajaPorSucursal,
  loadConciliacionKpis,
  loadConciliacionPorMetodo,
  loadTesoreriaKpis,
  loadTesoreriaPorOrigen,
} from './actions';

const filter: MetricFilter = { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' };
const kpis = [{ key: 'k', label: 'K', value: 1, unit: '$' }];
const breakdown = { dimension: 'd', slices: [{ key: 's', label: 'S', value: 1 }] };
const series = { labels: ['a'], datasets: [{ key: 'ds', label: 'DS', values: [1] }] };

describe('FinancieroMetricsEffects', () => {
  let actions$: Observable<Action>;
  let effects: FinancieroMetricsEffects;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    api = {
      getRevenueKpis: vi.fn(), getRevenueSeries: vi.fn(), getRevenueByMethod: vi.fn(), getRevenueByBranch: vi.fn(),
      getBillingKpis: vi.fn(), getBillingByCoverage: vi.fn(),
      getSettlementKpis: vi.fn(), getSettlementByInsurer: vi.fn(),
      getCashSessionKpis: vi.fn(), getCashSessionByBranch: vi.fn(),
      getDigitalBatchKpis: vi.fn(), getDigitalBatchByMethod: vi.fn(),
      getTreasuryKpis: vi.fn(), getTreasuryByOrigin: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        FinancieroMetricsEffects,
        provideMockActions(() => actions$),
        { provide: FinancieroMetricsApiService, useValue: api },
      ],
    });
    effects = TestBed.inject(FinancieroMetricsEffects);
  });

  // ── Fan-out: 1 filtro → 14 cargas ────────────────────────────────────────
  it('loadDashboard$ despacha las 14 cargas de área con el mismo filtro', async () => {
    actions$ = of(loadFinancieroMetricsDashboard({ filter }));
    const dispatched = await firstValueFrom(effects.loadDashboard$.pipe(toArray()));
    expect(dispatched).toEqual([
      loadRecaudacionKpis({ filter }),
      loadRecaudacionSerie({ filter }),
      loadRecaudacionPorMetodo({ filter }),
      loadRecaudacionPorSucursal({ filter }),
      loadFacturacionKpis({ filter }),
      loadFacturacionPorCobertura({ filter }),
      loadLiquidacionesKpis({ filter }),
      loadLiquidacionesPorObraSocial({ filter }),
      loadCajaKpis({ filter }),
      loadCajaPorSucursal({ filter }),
      loadConciliacionKpis({ filter }),
      loadConciliacionPorMetodo({ filter }),
      loadTesoreriaKpis({ filter }),
      loadTesoreriaPorOrigen({ filter }),
    ]);
  });

  // ── Tabla de los 14 endpoints: éxito / 304 / error para cada uno ────────────
  const cases: {
    effectKey: keyof FinancieroMetricsEffects;
    loadAction: (p: { filter: MetricFilter }) => Action;
    apiMethod: string;
    data: unknown;
    successType: string;
    notModifiedType: string;
    failureType: string;
  }[] = [
    { effectKey: 'loadRecaudacionKpis$', loadAction: loadRecaudacionKpis, apiMethod: 'getRevenueKpis', data: kpis,
      successType: '[Financiero Metrics Recaudación API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Recaudación API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Recaudación API] Load Kpis Failure' },
    { effectKey: 'loadRecaudacionSerie$', loadAction: loadRecaudacionSerie, apiMethod: 'getRevenueSeries', data: series,
      successType: '[Financiero Metrics Recaudación API] Load Serie Success',
      notModifiedType: '[Financiero Metrics Recaudación API] Load Serie Not Modified',
      failureType: '[Financiero Metrics Recaudación API] Load Serie Failure' },
    { effectKey: 'loadRecaudacionPorMetodo$', loadAction: loadRecaudacionPorMetodo, apiMethod: 'getRevenueByMethod', data: breakdown,
      successType: '[Financiero Metrics Recaudación API] Load Por Metodo Success',
      notModifiedType: '[Financiero Metrics Recaudación API] Load Por Metodo Not Modified',
      failureType: '[Financiero Metrics Recaudación API] Load Por Metodo Failure' },
    { effectKey: 'loadRecaudacionPorSucursal$', loadAction: loadRecaudacionPorSucursal, apiMethod: 'getRevenueByBranch', data: breakdown,
      successType: '[Financiero Metrics Recaudación API] Load Por Sucursal Success',
      notModifiedType: '[Financiero Metrics Recaudación API] Load Por Sucursal Not Modified',
      failureType: '[Financiero Metrics Recaudación API] Load Por Sucursal Failure' },
    { effectKey: 'loadFacturacionKpis$', loadAction: loadFacturacionKpis, apiMethod: 'getBillingKpis', data: kpis,
      successType: '[Financiero Metrics Facturación API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Facturación API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Facturación API] Load Kpis Failure' },
    { effectKey: 'loadFacturacionPorCobertura$', loadAction: loadFacturacionPorCobertura, apiMethod: 'getBillingByCoverage', data: breakdown,
      successType: '[Financiero Metrics Facturación API] Load Por Cobertura Success',
      notModifiedType: '[Financiero Metrics Facturación API] Load Por Cobertura Not Modified',
      failureType: '[Financiero Metrics Facturación API] Load Por Cobertura Failure' },
    { effectKey: 'loadLiquidacionesKpis$', loadAction: loadLiquidacionesKpis, apiMethod: 'getSettlementKpis', data: kpis,
      successType: '[Financiero Metrics Liquidaciones API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Liquidaciones API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Liquidaciones API] Load Kpis Failure' },
    { effectKey: 'loadLiquidacionesPorObraSocial$', loadAction: loadLiquidacionesPorObraSocial, apiMethod: 'getSettlementByInsurer', data: breakdown,
      successType: '[Financiero Metrics Liquidaciones API] Load Por Obra Social Success',
      notModifiedType: '[Financiero Metrics Liquidaciones API] Load Por Obra Social Not Modified',
      failureType: '[Financiero Metrics Liquidaciones API] Load Por Obra Social Failure' },
    { effectKey: 'loadCajaKpis$', loadAction: loadCajaKpis, apiMethod: 'getCashSessionKpis', data: kpis,
      successType: '[Financiero Metrics Caja API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Caja API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Caja API] Load Kpis Failure' },
    { effectKey: 'loadCajaPorSucursal$', loadAction: loadCajaPorSucursal, apiMethod: 'getCashSessionByBranch', data: breakdown,
      successType: '[Financiero Metrics Caja API] Load Por Sucursal Success',
      notModifiedType: '[Financiero Metrics Caja API] Load Por Sucursal Not Modified',
      failureType: '[Financiero Metrics Caja API] Load Por Sucursal Failure' },
    { effectKey: 'loadConciliacionKpis$', loadAction: loadConciliacionKpis, apiMethod: 'getDigitalBatchKpis', data: kpis,
      successType: '[Financiero Metrics Conciliación API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Conciliación API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Conciliación API] Load Kpis Failure' },
    { effectKey: 'loadConciliacionPorMetodo$', loadAction: loadConciliacionPorMetodo, apiMethod: 'getDigitalBatchByMethod', data: breakdown,
      successType: '[Financiero Metrics Conciliación API] Load Por Metodo Success',
      notModifiedType: '[Financiero Metrics Conciliación API] Load Por Metodo Not Modified',
      failureType: '[Financiero Metrics Conciliación API] Load Por Metodo Failure' },
    { effectKey: 'loadTesoreriaKpis$', loadAction: loadTesoreriaKpis, apiMethod: 'getTreasuryKpis', data: kpis,
      successType: '[Financiero Metrics Tesorería API] Load Kpis Success',
      notModifiedType: '[Financiero Metrics Tesorería API] Load Kpis Not Modified',
      failureType: '[Financiero Metrics Tesorería API] Load Kpis Failure' },
    { effectKey: 'loadTesoreriaPorOrigen$', loadAction: loadTesoreriaPorOrigen, apiMethod: 'getTreasuryByOrigin', data: breakdown,
      successType: '[Financiero Metrics Tesorería API] Load Por Origen Success',
      notModifiedType: '[Financiero Metrics Tesorería API] Load Por Origen Not Modified',
      failureType: '[Financiero Metrics Tesorería API] Load Por Origen Failure' },
  ];

  it.each(cases)('$effectKey emite Success con los datos del backend', async (c) => {
    api[c.apiMethod].mockReturnValue(of(c.data));
    actions$ = of(c.loadAction({ filter }));
    const action = await firstValueFrom(effects[c.effectKey] as Observable<Action>);
    expect(api[c.apiMethod]).toHaveBeenCalledWith(filter);
    expect(action.type).toBe(c.successType);
    expect((action as unknown as { data: unknown }).data).toEqual(c.data);
  });

  it.each(cases)('$effectKey emite NotModified en 304', async (c) => {
    api[c.apiMethod].mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(c.loadAction({ filter }));
    const action = await firstValueFrom(effects[c.effectKey] as Observable<Action>);
    expect(action.type).toBe(c.notModifiedType);
  });

  it.each(cases)('$effectKey mapea errores a Failure en español sin leak', async (c) => {
    api[c.apiMethod].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(c.loadAction({ filter }));
    const action = await firstValueFrom(effects[c.effectKey] as Observable<Action>);
    expect(action.type).toBe(c.failureType);
    const error = (action as unknown as { error: string }).error;
    expect(error).not.toMatch(/lab\.laboratorio\.|java\.|No enum constant/);
  });

  it('mapea 403 a un mensaje de acceso a sucursal', async () => {
    api['getRevenueKpis'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    actions$ = of(loadRecaudacionKpis({ filter }));
    const action = await firstValueFrom(effects.loadRecaudacionKpis$);
    expect((action as unknown as { error: string }).error).toBe('No tenés acceso a la sucursal seleccionada.');
  });

  it('mapea 400 a un mensaje de filtros inválidos', async () => {
    api['getRevenueKpis'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    actions$ = of(loadRecaudacionKpis({ filter }));
    const action = await firstValueFrom(effects.loadRecaudacionKpis$);
    expect((action as unknown as { error: string }).error).toBe('El rango de fechas o los filtros elegidos no son válidos.');
  });

  it('loadRecaudacionKpisNotModified/Failure quedan disponibles como identificadores exportados', () => {
    expect(loadRecaudacionKpisNotModified().type).toBe('[Financiero Metrics Recaudación API] Load Kpis Not Modified');
    expect(loadRecaudacionKpisFailure({ error: 'x' }).error).toBe('x');
    expect(loadRecaudacionKpisSuccess({ data: kpis }).data).toEqual(kpis);
    expect(loadRecaudacionPorSucursalSuccess({ data: breakdown }).data).toEqual(breakdown);
    expect(loadRecaudacionPorSucursalNotModified().type).toBe('[Financiero Metrics Recaudación API] Load Por Sucursal Not Modified');
    expect(loadRecaudacionPorSucursalFailure({ error: 'y' }).error).toBe('y');
  });
});
