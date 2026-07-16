import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
// Imports directos del submódulo, no del barrel — este servicio lo inyecta el effect,
// que está registrado eager en `app.config.ts` (ver nota en `analitica-metrics.model.ts`).
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';
import { buildMetricParams } from '@shared/metrics/util/build-metric-params';
import { DemografiaMetricsResponse, VolumenMetricsResponse } from '../models/analitica-metrics.model';

/**
 * HTTP para el dashboard de métricas de Analítica (KAN-204, tabs Volumen / Preanalítica /
 * Postanalítica). Todos los endpoints son polleables (ETag/304 — `withPolling()` agrega
 * el contexto que el `etagInterceptor` necesita para sumar `If-None-Match` y devolver el
 * sentinel `NotModified` en un 304).
 *
 * Subconjunto de los 56 endpoints de métricas del backend (PR #125) — solo los que el
 * dashboard consume hoy; ver `docs/superpowers/specs/2026-07-06-metricas-dashboards-design.md`.
 */
@Injectable({ providedIn: 'root' })
export class AnaliticaMetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica';

  // ── Volumen (analitica/metricas) — roles BIOQUIMICO/ADMINISTRADOR ──────────

  getVolumen(filter: MetricFilter): Observable<VolumenMetricsResponse | NotModified> {
    return this.http.get<VolumenMetricsResponse | NotModified>(`${this.base}/metricas/volumen`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getVolumenPorSeccion(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/metricas/volumen/por-seccion`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getDemografia(filter: MetricFilter): Observable<DemografiaMetricsResponse | NotModified> {
    return this.http.get<DemografiaMetricsResponse | NotModified>(`${this.base}/metricas/demografia`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  /** Distribución EN VIVO de sub-estados analíticos (no es serie histórica, MTA-06). */
  getSubEstados(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/metricas/sub-estados`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  // ── Preanalítica — roles TECNICO_LABORATORIO/BIOQUIMICO/ADMINISTRADOR ──────

  getPreanaliticaVolumenTendencia(filter: MetricFilter): Observable<MetricSeries | NotModified> {
    return this.http.get<MetricSeries | NotModified>(`${this.base}/preanalitica/metricas/volumen/tendencia`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getPreanaliticaRechazoResumen(filter: MetricFilter): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.base}/preanalitica/metricas/rechazo/resumen`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getPreanaliticaPerdidasResumen(filter: MetricFilter): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.base}/preanalitica/metricas/perdidas/resumen`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  /** Desglose de rechazo por sección — usado tanto para el gráfico como para la tabla del tab. */
  getPreanaliticaRechazoPorSeccion(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/preanalitica/metricas/rechazo/desglose`, {
      params: buildMetricParams(filter).set('dimension', 'seccion'), context: withPolling(),
    });
  }

  // ── Postanalítica — roles BIOQUIMICO/ADMINISTRADOR ──────────────────────────

  getPostanaliticaTatPromedio(filter: MetricFilter): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.base}/postanalitica/metricas/tat/promedio`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getPostanaliticaTatSerie(filter: MetricFilter): Observable<MetricSeries | NotModified> {
    return this.http.get<MetricSeries | NotModified>(`${this.base}/postanalitica/metricas/tat/serie`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getPostanaliticaEstudiosTotal(filter: MetricFilter): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.base}/postanalitica/metricas/estudios/total`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  /** Foto del estado actual de los estudios creados en el rango (no es reconstrucción histórica). */
  getPostanaliticaEstudiosPorEstado(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/postanalitica/metricas/estudios/por-estado`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }
}
