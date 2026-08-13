import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinancieroMetricsApiService } from './financiero-metrics-api.service';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';
import { MetricSeries } from '@shared/metrics/models/metric-envelopes.model';
import { NotModified } from '@core/refresh';

const filter: MetricFilter = { dateFrom: '2026-06-01', dateTo: '2026-06-30', branchId: 3, granularity: 'DAY' };
const filterNoBranch: MetricFilter = { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' };

describe('FinancieroMetricsApiService', () => {
  let svc: FinancieroMetricsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(FinancieroMetricsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getRevenueKpis arma la query con dateFrom/dateTo/granularity/branchId', () => {
    svc.getRevenueKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/kpis');
    expect(req.request.params.get('dateFrom')).toBe('2026-06-01');
    expect(req.request.params.get('dateTo')).toBe('2026-06-30');
    expect(req.request.params.get('granularity')).toBe('DAY');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush([]);
  });

  it('getRevenueSeries pega a /recaudacion/serie', () => {
    svc.getRevenueSeries(filter).subscribe();
    http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/serie').flush({ labels: [], datasets: [] });
  });

  it('getRevenueSeries preserva el campo `unit` del backend sin transformarlo (KAN-252 — el eje trata la serie como entero si esto se pierde)', () => {
    let result: MetricSeries | NotModified | undefined;
    svc.getRevenueSeries(filter).subscribe(res => { result = res; });

    http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/serie')
      .flush({ unit: 'currency', labels: ['ene'], datasets: [{ key: 'recaudacion', label: 'Recaudación', values: [1000] }] });

    expect((result as MetricSeries).unit).toBe('currency');
  });

  it('getRevenueByMethod pega a /recaudacion/por-metodo con branchId', () => {
    svc.getRevenueByMethod(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/por-metodo');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush({ dimension: 'metodo', slices: [] });
  });

  it('getRevenueByBranch NO manda branchId aunque el filtro lo traiga (desglose siempre tenant-wide)', () => {
    svc.getRevenueByBranch(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/por-sucursal');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ dimension: 'sucursal', slices: [] });
  });

  it('getBillingKpis pega a /facturacion/kpis con branchId', () => {
    svc.getBillingKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/facturacion/kpis');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush([]);
  });

  it('getBillingByCoverage pega a /facturacion/particular-vs-cobertura', () => {
    svc.getBillingByCoverage(filter).subscribe();
    http.expectOne(r => r.url === '/api/v1/financiero/metricas/facturacion/particular-vs-cobertura').flush({ dimension: 'cobertura', slices: [] });
  });

  it('getSettlementKpis NO manda branchId — liquidaciones es tenant-wide', () => {
    svc.getSettlementKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/liquidaciones/kpis');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush([]);
  });

  it('getSettlementByInsurer NO manda branchId', () => {
    svc.getSettlementByInsurer(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/liquidaciones/por-obra-social');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ dimension: 'obra-social', slices: [] });
  });

  it('getCashSessionKpis pega a /caja/kpis con branchId', () => {
    svc.getCashSessionKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/caja/kpis');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush([]);
  });

  it('getCashSessionByBranch NO manda branchId — desglose siempre tenant-wide', () => {
    svc.getCashSessionByBranch(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/caja/por-sucursal');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ dimension: 'sucursal', slices: [] });
  });

  it('getDigitalBatchKpis NO manda branchId — conciliación es tenant-wide', () => {
    svc.getDigitalBatchKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/conciliacion/kpis');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush([]);
  });

  it('getDigitalBatchByMethod NO manda branchId', () => {
    svc.getDigitalBatchByMethod(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/conciliacion/por-metodo');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ dimension: 'metodo', slices: [] });
  });

  it('getTreasuryKpis NO manda branchId — tesorería es 1-por-tenant', () => {
    svc.getTreasuryKpis(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/tesoreria/kpis');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush([]);
  });

  it('getTreasuryByOrigin NO manda branchId', () => {
    svc.getTreasuryByOrigin(filter).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/tesoreria/por-origen');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ dimension: 'origen', slices: [] });
  });

  it('sin branchId en el filtro, ninguna ruta lo agrega', () => {
    svc.getRevenueKpis(filterNoBranch).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/metricas/recaudacion/kpis');
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush([]);
  });
});
