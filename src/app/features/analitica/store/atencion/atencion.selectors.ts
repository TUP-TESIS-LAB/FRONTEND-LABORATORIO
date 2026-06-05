import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AttentionResponse, AttentionState, isTerminal } from '../../models/atencion.model';
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

export const selectFilteredAtenciones = createSelector(
  selectAtencionList,
  selectFilters,
  (list, filters): AttentionResponse[] => {
    const search = filters.search.trim().toLowerCase();
    return list.filter(item => {
      if (filters.states.length > 0 && !filters.states.includes(item.attentionState)) {
        return false;
      }
      if (search) {
        const haystack = [
          item.attentionNumber ?? '',
          String(item.patientId ?? ''),
          String(item.id),
        ].join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }
);

export const selectAtencionKpis = createSelector(
  selectAtencionList,
  (list) => ({
    total:     list.length,
    pendientes: list.filter(a => !isTerminal(a.attentionState)).length,
    esperandoExtraccion: list.filter(a => a.attentionState === AttentionState.AWAITING_EXTRACTION).length,
    finalizadas: list.filter(a => a.attentionState === AttentionState.FINISHED).length,
    urgentes:    list.filter(a => a.isUrgent && !isTerminal(a.attentionState)).length,
  })
);
