import { HttpParams } from '@angular/common/http';
import { MetricFilter } from '../models/metric-filter.model';

/**
 * Traduce un `MetricFilter` a los query params que esperan los endpoints de métricas
 * (`dateFrom`/`dateTo`/`granularity` siempre, `branchId` solo si está definido).
 */
export function buildMetricParams(filter: MetricFilter): HttpParams {
  let params = new HttpParams()
    .set('dateFrom', filter.dateFrom)
    .set('dateTo', filter.dateTo)
    .set('granularity', filter.granularity);

  if (filter.branchId != null) {
    params = params.set('branchId', filter.branchId);
  }

  return params;
}
