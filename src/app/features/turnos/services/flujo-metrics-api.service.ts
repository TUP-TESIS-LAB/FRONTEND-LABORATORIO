import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
import { buildMetricParams, MetricBreakdown, MetricFilter, MetricKpi } from '@shared/metrics';
import {
  EsperaLlamadoResponse,
  OcupacionAgendaResponse,
  ReLlamadosResponse,
  VolumenColaResponse,
  VolumenTurnosResponse,
} from '../models/flujo-metrics.model';

/**
 * Cliente HTTP de las métricas de flujo operativo (FOP-01..10, PR #125).
 *
 * FOP-01..06 viven en `turnos/metricas` y aceptan el `MetricFilter` completo
 * (dateFrom/dateTo/branchId/granularity). FOP-07 (`carga-extractor`) vive en
 * `atencion/metricas` pero es histórica igual que las de turnos — el backend
 * NO acepta `granularity` en ese endpoint, así que se arman los params a mano.
 * FOP-08..10 ("en vivo") son gauges snapshot: solo aceptan `branchId`.
 *
 * Todos los métodos van con `withPolling()` para que el `etagInterceptor` sume
 * `If-None-Match` y el effect distinga `NotModified` (CLAUDE.md regla #5).
 */
@Injectable({ providedIn: 'root' })
export class FlujoMetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly turnosBase = '/api/v1/turnos/metricas';
  private readonly atencionBase = '/api/v1/atencion/metricas';

  // ── Histórico (turnos) ───────────────────────────────────────────────────
  getVolumenTurnos(filter: MetricFilter): Observable<VolumenTurnosResponse | NotModified> {
    return this.http.get<VolumenTurnosResponse | NotModified>(`${this.turnosBase}/volumen-turnos`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  getVolumenCola(filter: MetricFilter): Observable<VolumenColaResponse | NotModified> {
    return this.http.get<VolumenColaResponse | NotModified>(`${this.turnosBase}/volumen-cola`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  getTasaCancelacion(filter: MetricFilter): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.turnosBase}/tasa-cancelacion`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  getOcupacionAgenda(filter: MetricFilter): Observable<OcupacionAgendaResponse | NotModified> {
    return this.http.get<OcupacionAgendaResponse | NotModified>(`${this.turnosBase}/ocupacion-agenda`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  getEsperaLlamado(filter: MetricFilter): Observable<EsperaLlamadoResponse | NotModified> {
    return this.http.get<EsperaLlamadoResponse | NotModified>(`${this.turnosBase}/espera-llamado`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  getReLlamados(filter: MetricFilter): Observable<ReLlamadosResponse | NotModified> {
    return this.http.get<ReLlamadosResponse | NotModified>(`${this.turnosBase}/re-llamados`, {
      params: buildMetricParams(filter),
      context: withPolling(),
    });
  }

  // ── Histórico (atencion) — sin granularity ──────────────────────────────
  getCargaExtractor(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    let params = new HttpParams().set('dateFrom', filter.dateFrom).set('dateTo', filter.dateTo);
    if (filter.branchId != null) params = params.set('branchId', filter.branchId);
    return this.http.get<MetricBreakdown | NotModified>(`${this.atencionBase}/carga-extractor`, {
      params,
      context: withPolling(),
    });
  }

  // ── En vivo (atencion) — solo branchId, sin rango de fechas ─────────────
  getColaExtraccionVivo(branchId?: number): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.atencionBase}/cola-extraccion-vivo`, {
      params: this.branchParams(branchId),
      context: withPolling(),
    });
  }

  getOcupacionBoxesVivo(branchId?: number): Observable<MetricKpi | NotModified> {
    return this.http.get<MetricKpi | NotModified>(`${this.atencionBase}/ocupacion-boxes-vivo`, {
      params: this.branchParams(branchId),
      context: withPolling(),
    });
  }

  getUrgentes(branchId?: number): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.atencionBase}/urgentes`, {
      params: this.branchParams(branchId),
      context: withPolling(),
    });
  }

  private branchParams(branchId?: number): HttpParams {
    return branchId != null ? new HttpParams().set('branchId', branchId) : new HttpParams();
  }
}
