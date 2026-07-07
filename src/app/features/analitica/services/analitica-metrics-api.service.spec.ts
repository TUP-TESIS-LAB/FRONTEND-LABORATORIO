import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { POLLING_REQUEST, etagInterceptor } from '@core/refresh';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';
import { AnaliticaMetricsApiService } from './analitica-metrics-api.service';

const filter: MetricFilter = { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' };
const filterWithBranch: MetricFilter = { ...filter, branchId: 7 };

describe('AnaliticaMetricsApiService', () => {
  let service: AnaliticaMetricsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([etagInterceptor])),
        provideHttpClientTesting(),
        AnaliticaMetricsApiService,
      ],
    });
    service = TestBed.inject(AnaliticaMetricsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getVolumen hits /analitica/metricas/volumen with dateFrom/dateTo/granularity and POLLING_REQUEST', () => {
    service.getVolumen(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/metricas/volumen');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('dateFrom')).toBe('2026-06-01');
    expect(req.request.params.get('dateTo')).toBe('2026-06-30');
    expect(req.request.params.get('granularity')).toBe('DAY');
    expect(req.request.params.has('branchId')).toBe(false);
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
    req.flush({ kpi: null, series: null });
  });

  it('getVolumen sends branchId only when present in the filter', () => {
    service.getVolumen(filterWithBranch).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/metricas/volumen');
    expect(req.request.params.get('branchId')).toBe('7');
    req.flush({ kpi: null, series: null });
  });

  it('getVolumenPorSeccion hits /analitica/metricas/volumen/por-seccion', () => {
    service.getVolumenPorSeccion(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/metricas/volumen/por-seccion');
    req.flush({ dimension: 'seccion', slices: [] });
  });

  it('getDemografia hits /analitica/metricas/demografia', () => {
    service.getDemografia(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/metricas/demografia');
    req.flush({ porEdad: { dimension: 'edad', slices: [] }, porGenero: { dimension: 'genero', slices: [] } });
  });

  it('getSubEstados hits /analitica/metricas/sub-estados', () => {
    service.getSubEstados(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/metricas/sub-estados');
    req.flush({ dimension: 'sub-estado', slices: [] });
  });

  it('getPreanaliticaVolumenTendencia hits /preanalitica/metricas/volumen/tendencia', () => {
    service.getPreanaliticaVolumenTendencia(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/preanalitica/metricas/volumen/tendencia');
    req.flush({ labels: [], datasets: [] });
  });

  it('getPreanaliticaRechazoResumen hits /preanalitica/metricas/rechazo/resumen', () => {
    service.getPreanaliticaRechazoResumen(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/preanalitica/metricas/rechazo/resumen');
    req.flush({ key: 'rechazo', label: 'Tasa de rechazo', value: 0, unit: '%' });
  });

  it('getPreanaliticaPerdidasResumen hits /preanalitica/metricas/perdidas/resumen', () => {
    service.getPreanaliticaPerdidasResumen(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/preanalitica/metricas/perdidas/resumen');
    req.flush({ key: 'perdidas', label: 'Pérdidas', value: 0, unit: 'muestras' });
  });

  it('getPreanaliticaRechazoPorSeccion hits /preanalitica/metricas/rechazo/desglose con dimension=seccion', () => {
    service.getPreanaliticaRechazoPorSeccion(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/preanalitica/metricas/rechazo/desglose');
    expect(req.request.params.get('dimension')).toBe('seccion');
    req.flush({ dimension: 'seccion', slices: [] });
  });

  it('getPostanaliticaTatPromedio hits /postanalitica/metricas/tat/promedio', () => {
    service.getPostanaliticaTatPromedio(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/postanalitica/metricas/tat/promedio');
    req.flush({ key: 'tat', label: 'TAT promedio', value: 0, unit: 'minutos' });
  });

  it('getPostanaliticaTatSerie hits /postanalitica/metricas/tat/serie', () => {
    service.getPostanaliticaTatSerie(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/postanalitica/metricas/tat/serie');
    req.flush({ labels: [], datasets: [] });
  });

  it('getPostanaliticaEstudiosTotal hits /postanalitica/metricas/estudios/total', () => {
    service.getPostanaliticaEstudiosTotal(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/postanalitica/metricas/estudios/total');
    req.flush({ key: 'total', label: 'Estudios', value: 0, unit: 'estudios' });
  });

  it('getPostanaliticaEstudiosPorEstado hits /postanalitica/metricas/estudios/por-estado', () => {
    service.getPostanaliticaEstudiosPorEstado(filter).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/postanalitica/metricas/estudios/por-estado');
    req.flush({ dimension: 'estado', slices: [] });
  });
});
