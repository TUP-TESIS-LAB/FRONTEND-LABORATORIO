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
  loadPricing,
  loadPricingFailure,
  loadPricingSuccess,
  patientNotFound,
  patientResolutionFailure,
  patientResolved,
  resetAtencionWizard,
  resolvePatientByDni,
  returnPhase,
  setAtencionFilters,
  setCopayment,
  setCopaymentFailure,
  setCopaymentSuccess,
  startAttentionForPatient,
  updatePatientInline,
  removeAnalysisFromResumen,
  removeAnalysisFromResumenSuccess,
  removeAnalysisFromResumenFailure,
  verifyPatient,
  verifyPatientSuccess,
  verifyPatientFailure,
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

  on(loadPricing, (s): AtencionFeatureState => ({ ...s, pricingLoading: true, pricingError: null })),
  on(loadPricingSuccess, (s, { pricing }): AtencionFeatureState => ({ ...s, pricingLoading: false, pricing })),
  on(loadPricingFailure, (s, { error }): AtencionFeatureState => ({ ...s, pricingLoading: false, pricingError: error })),

  on(setCopayment, (s): AtencionFeatureState => ({ ...s, copaymentMutating: true })),
  on(setCopaymentSuccess, (s, { item }): AtencionFeatureState => ({
    ...s,
    copaymentMutating: false,
    detail: item,
    list: replaceInList(s.list, item),
  })),
  on(setCopaymentFailure, (s): AtencionFeatureState => ({ ...s, copaymentMutating: false })),

  on(removeAnalysisFromResumen, (s): AtencionFeatureState => ({ ...s, removingAnalysis: true })),
  on(removeAnalysisFromResumenSuccess, (s, { item }): AtencionFeatureState => ({
    ...s,
    removingAnalysis: false,
    detail: item,
    list: replaceInList(s.list, item),
  })),
  on(removeAnalysisFromResumenFailure, (s): AtencionFeatureState => ({ ...s, removingAnalysis: false })),

  on(resetAtencionWizard, (s): AtencionFeatureState => ({
    ...s,
    detail: null,
    detailError: null,
    resolvedPatient: null,
    patientNotFoundDni: null,
    summaryAnalyses: [],
    pricing: null,
  })),

  on(verifyPatient, (s): AtencionFeatureState => ({ ...s, verifyingPatient: true })),
  on(verifyPatientSuccess, (s, { patient }): AtencionFeatureState => ({ ...s, resolvedPatient: patient, verifyingPatient: false })),
  on(verifyPatientFailure, (s): AtencionFeatureState => ({ ...s, verifyingPatient: false })),
);

function replaceInList<T extends { id: number }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
}
