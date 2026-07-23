import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExportFormat, ReportDef, ReportPageResponse, ReportQuery } from '../models/report.model';

/**
 * Servicio genérico para los 17 reportes del catálogo. Un solo servicio en vez
 * de uno por reporte porque los 17 comparten exactamente el mismo contrato de
 * listado paginado + export (ver `models/report.model.ts`) — solo cambian el
 * `endpoint` y los filtros propios, que ya vienen resueltos en `ReportQuery.filters`.
 */
@Injectable({ providedIn: 'root' })
export class ReportesApiService {
  private readonly http = inject(HttpClient);

  list(def: ReportDef, query: ReportQuery): Observable<ReportPageResponse> {
    const params = this.buildListParams(query);
    return this.http.get<ReportPageResponse>(def.endpoint, { params });
  }

  /** Descarga el archivo del reporte. Devuelve la respuesta completa para leer Content-Disposition. */
  export(def: ReportDef, format: ExportFormat, query: ReportQuery): Observable<HttpResponse<Blob>> {
    let params = this.buildFilterParams(query.filters).set('format', format);
    return this.http.get(`${def.endpoint}/export`, {
      params, responseType: 'blob', observe: 'response',
    });
  }

  private buildListParams(query: ReportQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    // El backend parsea el orden en formato combinado `campo,DIRECCION` (ReportSortParam),
    // NO como dos params separados: mandar `direction` aparte hace que el DESC se ignore.
    if (query.sortField) {
      params = params.set('sort', query.sortDir ? `${query.sortField},${query.sortDir}` : query.sortField);
    }
    return this.appendFilters(params, query.filters);
  }

  private buildFilterParams(filters: Record<string, unknown>): HttpParams {
    return this.appendFilters(new HttpParams(), filters);
  }

  /**
   * Serializa el bag plano de filtros (universales + propios del reporte) a query
   * params. Arrays (multiselect de `ui-filter-bar`) se mandan como CSV. Valores
   * vacíos/null/[] se omiten para no ensuciar la URL con params sin efecto.
   */
  private appendFilters(params: HttpParams, filters: Record<string, unknown>): HttpParams {
    let result = params;
    for (const [key, value] of Object.entries(filters)) {
      if (value == null || value === '') continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        result = result.set(key, value.join(','));
        continue;
      }
      result = result.set(key, String(value));
    }
    return result;
  }
}
