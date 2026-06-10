import { createFeatureSelector, createSelector } from '@ngrx/store';
import { isSameLocalDay } from '@shared/utils/same-local-day';
import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import { ATENCION_FEATURE_KEY, AtencionFeatureState } from './atencion.state';

export const selectAtencionState = createFeatureSelector<AtencionFeatureState>(ATENCION_FEATURE_KEY);

export const selectAtencionList    = createSelector(selectAtencionState, s => s.list);
export const selectListLoading     = createSelector(selectAtencionState, s => s.listLoading);
export const selectFilters         = createSelector(selectAtencionState, s => s.filters);
export const selectDetail          = createSelector(selectAtencionState, s => s.detail);
export const selectDetailLoading   = createSelector(selectAtencionState, s => s.detailLoading);
export const selectDetailError     = createSelector(selectAtencionState, s => s.detailError);
export const selectMutating               = createSelector(selectAtencionState, s => s.mutating);
export const selectResolvedPatient        = createSelector(selectAtencionState, s => s.resolvedPatient);
export const selectPatientResolving       = createSelector(selectAtencionState, s => s.patientResolving);
export const selectPatientNotFoundDni     = createSelector(selectAtencionState, s => s.patientNotFoundDni);
export const selectPatientResolutionError = createSelector(selectAtencionState, s => s.patientResolutionError);
export const selectSummaryAnalyses        = createSelector(selectAtencionState, s => s.summaryAnalyses);
export const selectPricing                = createSelector(selectAtencionState, s => s.pricing);
export const selectPricingLoading         = createSelector(selectAtencionState, s => s.pricingLoading);
export const selectPricingError           = createSelector(selectAtencionState, s => s.pricingError);
export const selectCopaymentMutating      = createSelector(selectAtencionState, s => s.copaymentMutating);
export const selectRemovingAnalysis       = createSelector(selectAtencionState, s => s.removingAnalysis);
export const selectVerifyingPatient       = createSelector(selectAtencionState, s => s.verifyingPatient);

export const selectFilteredAtenciones = createSelector(
  selectAtencionList,
  selectFilters,
  (list, filters): AttentionResponse[] => {
    const search = filters.search.trim().toLowerCase();
    const filtered = list.filter(item => {
      if (filters.states.length > 0 && !filters.states.includes(item.attentionState)) {
        return false;
      }
      if (search) {
        // Búsqueda por nombre / DNI del paciente (con N° de atención como apoyo).
        const haystack = [
          item.patientFullName ?? '',
          item.patientDni ?? '',
          item.attentionNumber ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    // Orden por fecha de alta DESCENDENTE (más recientes primero). createdAt es ISO-8601,
    // así que el orden lexicográfico coincide con el cronológico; los nulos quedan al final.
    return [...filtered].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
);

/**
 * Listado del DÍA ACTUAL: solo las atenciones creadas hoy (en hora local). El
 * listado de Recepción → tab "Atenciones" no debe arrastrar atenciones de días
 * previos. Se filtra sobre el resultado ya filtrado por estado/búsqueda. Las
 * atenciones sin `createdAt` (no deberían existir) quedan fuera por seguridad.
 */
export const selectTodayAtenciones = createSelector(
  selectFilteredAtenciones,
  (list): AttentionResponse[] => {
    const now = new Date();
    return list.filter(a => isSameLocalDay(a.createdAt, now));
  },
);

export interface AtencionKpis {
  /** Atenciones canceladas cuyo último cambio (cancelación) ocurrió hoy. */
  canceladasHoy: number;
  /** Atenciones finalizadas en el listado actual. */
  finalizadas: number;
}

/** Helper puro (testeable con un `now` fijo) que arma las métricas del bloque colapsable. */
export function summarizeAtenciones(list: AttentionResponse[], now: Date): AtencionKpis {
  return {
    canceladasHoy: list.filter(a =>
      a.attentionState === AttentionState.CANCELED
      && a.updatedAt != null
      && isSameLocalDay(a.updatedAt, now),
    ).length,
    finalizadas: list.filter(a => a.attentionState === AttentionState.FINISHED).length,
  };
}

export const selectAtencionKpis = createSelector(
  selectAtencionList,
  (list): AtencionKpis => summarizeAtenciones(list, new Date()),
);
