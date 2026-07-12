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
  qualitativeCategoryId: number | null;
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
  qualitativeValue: number | null;
}

/** Valor individual dentro de una categoría cualitativa. */
export interface QualitativeCategoryValue {
  id: number;
  label: string;
  displayOrder: number;
}

/** Categoría cualitativa de resultado (p.ej. Color de orina). */
export interface QualitativeCategory {
  id: number;
  name: string;
  ordinal: boolean;
  global: boolean;
  values: QualitativeCategoryValue[];
}

/** Determinación del catálogo de un análisis (id + nombre + unidad de medida). */
export interface DeterminationCatalogItem {
  id: number;
  name: string;
  unit: string | null;
}

/** Opción de tipo de preparación (catálogo fijo del BE). */
export interface PreparationTypeOption {
  code: string;
  label: string;
  requiresHours: boolean;
}

/** Item de preparación estructurada de una determinación. */
export interface PreparationItem {
  type: string;
  label?: string;       // presente en lectura, opcional en escritura
  fastingHours: number | null;
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
  handlingTimeValue: number | null;
  handlingTimeUnit: 'HOURS' | 'DAYS' | null;
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
  private readonly catalogBase = '/api/v1/analitica/catalog';
  private readonly tenantAnalysesBase = '/api/v1/tenant-analyses';
  private readonly preparationBase = '/api/v1/analitica/preparation';
  private readonly qualCategoriesUrl = '/api/v1/analitica/qualitative-categories';

  /**
   * Determinaciones del catálogo de un análisis (id + nombre + unidad). La unidad se
   * muestra read-only como contexto en cada panel de valores de referencia del drawer.
   */
  getCatalogDeterminations(analysisCatalogId: number): Observable<DeterminationCatalogItem[]> {
    return this.http.get<DeterminationCatalogItem[]>(`${this.catalogBase}/${analysisCatalogId}/determinations`);
  }

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

  updateTenantAnalysis(
    tenantAnalysisId: number,
    body: {
      shortCode?: string;
      customName?: string | null;
      handlingTimeValue?: number | null;
      handlingTimeUnit?: 'HOURS' | 'DAYS' | null;
    },
  ): Observable<unknown> {
    return this.http.patch(`${this.tenantAnalysesBase}/${tenantAnalysisId}`, body);
  }

  getPreparationTypes(): Observable<PreparationTypeOption[]> {
    return this.http.get<PreparationTypeOption[]>(`${this.preparationBase}/types`);
  }

  getPreparation(determinationId: number): Observable<{ items: PreparationItem[] }> {
    return this.http.get<{ items: PreparationItem[] }>(`${this.detBase}/${determinationId}/preparation`);
  }

  upsertPreparation(
    determinationId: number,
    items: { type: string; fastingHours: number | null }[],
  ): Observable<void> {
    return this.http.put<void>(`${this.detBase}/${determinationId}/preparation`, { items });
  }

  setActivation(
    catalogId: number,
    active: boolean,
    shortCode: string,
    customName: string | null,
  ): Observable<void> {
    return this.http.put<void>(`${this.tenantAnalysesBase}/activation`, {
      catalogId, active, shortCode, customName,
    });
  }

  getQualitativeCategories(): Observable<QualitativeCategory[]> {
    return this.http.get<QualitativeCategory[]>(this.qualCategoriesUrl);
  }

  createQualitativeCategory(name: string, ordinal: boolean, values: string[]): Observable<QualitativeCategory> {
    return this.http.post<QualitativeCategory>(this.qualCategoriesUrl, { name, ordinal, values });
  }
}
