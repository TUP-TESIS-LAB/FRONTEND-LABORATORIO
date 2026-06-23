import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Override de configuración de fase de una determinación, a nivel tenant.
 * Espeja TenantDeterminationOverrideRequest/Response del backend.
 */
export interface DeterminationOverride {
  percentageVariationTolerated: number | null;
  preIndications: string | null;   // ayuno / indicaciones preanalíticas
  preObservations: string | null;
  analyticalType: string | null;
  canBringSample: boolean | null;
  measurementUnitId: number | null;
  isPrintable: boolean | null;
  printOrder: number | null;
  printGroup: number | null;
  specialPrintName: string | null;
  loadingResultOrder: number | null;
  requiresLoadValue: boolean | null;
  requiresApproval: boolean | null;
  canSelfApprove: boolean | null;
  handlingTimeValue: number | null;
  handlingTimeUnit: string | null;
}

/** Respuesta de GET /determinations/{id}/override. */
export interface TenantOverrideResponse {
  hasOverride: boolean;
  override: DeterminationOverride | null;
}

/** Item de valor de referencia propio del tenant para una determinación. */
export interface ReferenceValueItem {
  minValue: number | null;
  maxValue: number | null;
  criticalMinValue: number | null;
  criticalMaxValue: number | null;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  gender: 'MALE' | 'FEMALE' | null;
  unit: string | null;
}

/** Fila de tenant_analysis (activación + alias + sección del laboratorio). */
export interface TenantAnalysisRow {
  id: number;            // tenant_analysis.id (el que recibe PATCH)
  catalogId: number;     // analysis_catalog.id (match con la fila del catálogo NBU)
  nbuCode: string | null;
  shortCode: string;
  customName: string | null;
  active: boolean;
  defaultSectionId: number | null;
}

/**
 * HTTP de la capa configurable por tenant del NBU (override de determinaciones,
 * valores de referencia propios y sección del análisis). La consume el drawer de
 * configuración y la carga del resumen. Las mutaciones requieren ADMINISTRADOR (gating BE).
 */
@Injectable({ providedIn: 'root' })
export class NbuConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly detBase = '/api/v1/analitica/determinations';
  private readonly tenantAnalysesBase = '/api/v1/tenant-analyses';

  getOverride(determinationId: number): Observable<TenantOverrideResponse> {
    return this.http.get<TenantOverrideResponse>(`${this.detBase}/${determinationId}/override`);
  }

  upsertOverride(determinationId: number, body: Partial<DeterminationOverride>): Observable<DeterminationOverride> {
    return this.http.put<DeterminationOverride>(`${this.detBase}/${determinationId}/override`, body);
  }

  getReferenceValues(determinationId: number): Observable<ReferenceValueItem[]> {
    return this.http.get<ReferenceValueItem[]>(`${this.detBase}/${determinationId}/reference-values/override`);
  }

  upsertReferenceValues(determinationId: number, items: ReferenceValueItem[]): Observable<ReferenceValueItem[]> {
    return this.http.put<ReferenceValueItem[]>(`${this.detBase}/${determinationId}/reference-values/override`, items);
  }

  listTenantAnalyses(): Observable<TenantAnalysisRow[]> {
    return this.http.get<TenantAnalysisRow[]>(this.tenantAnalysesBase);
  }

  patchSection(tenantAnalysisId: number, defaultSectionId: number | null): Observable<unknown> {
    return this.http.patch(`${this.tenantAnalysesBase}/${tenantAnalysisId}`, { defaultSectionId });
  }
}
