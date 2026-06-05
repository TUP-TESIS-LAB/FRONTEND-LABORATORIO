import { createReducer, on } from '@ngrx/store';
import {
  addAnalysisList,
  addObservations,
  addPayment,
  assignGeneralData,
  atencionMutationFailure,
  atencionMutationSuccess,
  attentionAnalysesFailure,
  attentionAnalysesLoaded,
  cancelAtencion,
  createBlankAtencion,
  createPatientInline,
  createPreFilledAtencion,
  endBilling,
  endCollection,
  endSecretaryPhase,
  loadAtencion,
  loadAtencionFailure,
  loadAtencionSuccess,
  loadAtenciones,
  loadAtencionesFailure,
  loadAtencionesSuccess,
  loadAttentionAnalyses,
  loadAttentionPatient,
  patientNotFound,
  patientResolutionFailure,
  patientResolved,
  resolvePatientByDni,
  returnPhase,
  setAtencionFilters,
  startAttentionForPatient,
  updatePatientInline,
} from './atencion.actions';
import { AtencionFeatureState, initialAtencionState } from './atencion.state';

export const atencionReducer = createReducer(
  initialAtencionState,

  on(loadAtenciones, (s): AtencionFeatureState => ({ ...s, listLoading: true, listError: null })),
  on(loadAtencionesSuccess, (s, { items }): AtencionFeatureState => ({ ...s, listLoading: false, list: items })),
  on(loadAtencionesFailure, (s, { error }): AtencionFeatureState => ({ ...s, listLoading: false, listError: error })),

  on(setAtencionFilters, (s, { filters }): AtencionFeatureState => ({ ...s, filters: { ...s.filters, ...filters } })),

  on(loadAtencion, (s): AtencionFeatureState => ({ ...s, detailLoading: true, detailError: null })),
  on(loadAtencionSuccess, (s, { item }): AtencionFeatureState => ({ ...s, detailLoading: false, detail: item })),
  on(loadAtencionFailure, (s, { error }): AtencionFeatureState => ({ ...s, detailLoading: false, detailError: error })),

  on(
    createBlankAtencion, createPreFilledAtencion,
    assignGeneralData, addAnalysisList, addPayment,
    endCollection, endBilling, endSecretaryPhase,
    returnPhase, cancelAtencion, addObservations,
    (s): AtencionFeatureState => ({ ...s, mutating: true, detailError: null })
  ),

  on(atencionMutationSuccess, (s, { item }): AtencionFeatureState => ({
    ...s,
    mutating: false,
    detail: item,
    list: replaceInList(s.list, item),
  })),
  on(atencionMutationFailure, (s, { error }): AtencionFeatureState => ({ ...s, mutating: false, detailError: error })),

  on(loadAttentionPatient, (s): AtencionFeatureState => ({ ...s, resolvedPatient: null })),
  on(resolvePatientByDni, (s): AtencionFeatureState => ({ ...s, patientResolving: true, patientResolutionError: null, resolvedPatient: null, patientNotFoundDni: null })),
  on(patientResolved, (s, { patient }): AtencionFeatureState => ({ ...s, patientResolving: false, resolvedPatient: patient, patientNotFoundDni: null })),
  on(patientNotFound, (s, { dni }): AtencionFeatureState => ({ ...s, patientResolving: false, resolvedPatient: null, patientNotFoundDni: dni })),
  on(patientResolutionFailure, (s, { error }): AtencionFeatureState => ({ ...s, patientResolving: false, patientResolutionError: error })),
  on(createPatientInline, updatePatientInline, (s): AtencionFeatureState => ({ ...s, patientResolving: true, patientResolutionError: null })),
  on(startAttentionForPatient, (s): AtencionFeatureState => ({ ...s, mutating: true, detailError: null })),

  on(loadAttentionAnalyses, (s): AtencionFeatureState => ({ ...s, summaryAnalysesLoading: true })),
  on(attentionAnalysesLoaded, (s, { analyses }): AtencionFeatureState => ({ ...s, summaryAnalyses: analyses, summaryAnalysesLoading: false })),
  on(attentionAnalysesFailure, (s): AtencionFeatureState => ({ ...s, summaryAnalysesLoading: false })),
);

function replaceInList<T extends { id: number }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
}
