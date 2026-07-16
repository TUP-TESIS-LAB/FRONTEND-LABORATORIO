import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
// NOTA: import directo (no del barrel `@shared/metrics`) — este service se registra
// eager en app.config.ts vía `FinancieroMetricsEffects`, y el barrel re-exporta
// `ui-metric-chart`, que arrastra chart.js al bundle inicial. Ver store/metrics/state.ts.
import { buildMetricParams } from '@shared/metrics/util/build-metric-params';
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';

/** `filter` sin `branchId` — para las áreas/desgloses tenant-wide (ver Javadoc del controller). */
function withoutBranch(filter: MetricFilter): MetricFilter {
  return { ...filter, branchId: undefined };
}

/**
 * Cliente HTTP de las 14 rutas de métricas del módulo FINANCIERO (MFI-01 a MFI-06,
 * PR #125 del backend). Todas polleables (ETag/304) vía `withPolling()` +
 * `etagInterceptor` — ver `@shared/metrics`.
 *
 * `branchId` solo se envía en las rutas que efectivamente filtran por sucursal
 * (recaudación kpis/serie/por-método, facturación, caja kpis). Los desgloses
 * "por-sucursal" (recaudación, caja) lo rechazan con 400 si se manda, y
 * liquidaciones/conciliación/tesorería son tenant-wide por diseño — en ambos
 * casos se omite con `withoutBranch`.
 */
@Injectable({ providedIn: 'root' })
export class FinancieroMetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero/metricas';

  // ── Recaudación (MFI-01) ─────────────────────────────────────────────────
  getRevenueKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/recaudacion/kpis`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getRevenueSeries(filter: MetricFilter): Observable<MetricSeries | NotModified> {
    return this.http.get<MetricSeries | NotModified>(`${this.base}/recaudacion/serie`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getRevenueByMethod(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/recaudacion/por-metodo`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  /** Rechaza `branchId` con 400 — desglose siempre tenant-wide. */
  getRevenueByBranch(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/recaudacion/por-sucursal`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  // ── Facturación (MFI-02) ─────────────────────────────────────────────────
  getBillingKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/facturacion/kpis`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  getBillingByCoverage(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/facturacion/particular-vs-cobertura`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  // ── Liquidaciones (MFI-03) — tenant-wide, Settlement no tiene sucursal propia ──
  getSettlementKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/liquidaciones/kpis`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  getSettlementByInsurer(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/liquidaciones/por-obra-social`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  // ── Caja (MFI-04) ────────────────────────────────────────────────────────
  getCashSessionKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/caja/kpis`, {
      params: buildMetricParams(filter), context: withPolling(),
    });
  }

  /** Rechaza `branchId` con 400 — desglose siempre tenant-wide. */
  getCashSessionByBranch(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/caja/por-sucursal`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  // ── Conciliación (MFI-05) — tenant-wide, DigitalBatch no tiene sucursal ────
  getDigitalBatchKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/conciliacion/kpis`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  getDigitalBatchByMethod(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/conciliacion/por-metodo`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  // ── Tesorería (MFI-06) — tenant-wide, Treasury es 1-por-tenant ─────────────
  getTreasuryKpis(filter: MetricFilter): Observable<MetricKpi[] | NotModified> {
    return this.http.get<MetricKpi[] | NotModified>(`${this.base}/tesoreria/kpis`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }

  getTreasuryByOrigin(filter: MetricFilter): Observable<MetricBreakdown | NotModified> {
    return this.http.get<MetricBreakdown | NotModified>(`${this.base}/tesoreria/por-origen`, {
      params: buildMetricParams(withoutBranch(filter)), context: withPolling(),
    });
  }
}
