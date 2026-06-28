import { createReducer, on } from '@ngrx/store';
import { createPatientPortalAccountSuccess } from '../../../pacientes/store/patient.actions';
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
  setAuthorizationNumber,
  setAuthorizationNumberFailure,
  setAuthorizationNumberSuccess,
  setCopayment,
  setCopaymentFailure,
  setCopaymentSuccess,
  setUrgentFlagSuccess,
  startAttentionForPatient,
  updatePatientInline,
  removeAnalysisFromResumen,
  removeAnalysisFromResumenSuccess,
  removeAnalysisFromResumenFailure,
  verifyPatient,
  verifyPatientSuccess,
  verifyPatientFailure,
  loadPatientGuardians,
  loadPatientGuardiansSuccess,
  loadPatientGuardiansFailure,
  validateBond,
  validateBondSuccess,
  validateBondFailure,
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
  on(resolvePatientByDni, (s): AtencionFeatureState => ({ ...s, patientResolving: true, patientResolutionError: null, resolvedPatient: null, patientNotFoundDni: null, guardians: [] })),
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
  on(setCopaymentSuccess, (s, { item }): AtencionFeatureState => {
    // El endpoint de copago devuelve la atención SIN `analysisAuthorizations`
    // (a diferencia del GET y de otras mutaciones). Si reemplazáramos el `detail`
    // verbatim, el listado de análisis del resumen (paso 3) quedaría vacío al
    // tipear el copago y hacer blur. Preservamos las autorizaciones del detail
    // actual cuando la respuesta no las trae; si el backend las incluye, se usan.
    const merged = s.detail && !item.analysisAuthorizations?.length
      ? { ...item, analysisAuthorizations: s.detail.analysisAuthorizations }
      : item;
    return {
      ...s,
      copaymentMutating: false,
      detail: merged,
      list: replaceInList(s.list, merged),
    };
  }),
  on(setCopaymentFailure, (s): AtencionFeatureState => ({ ...s, copaymentMutating: false })),

  on(setAuthorizationNumber, (s): AtencionFeatureState => ({ ...s, authorizationMutating: true })),
  on(setAuthorizationNumberSuccess, (s, { item }): AtencionFeatureState => {
    // Igual que el copago: el endpoint dedicado devuelve la atención SIN
    // `analysisAuthorizations`. Preservamos las del detail actual cuando la
    // respuesta no las trae para no vaciar el listado del resumen.
    const merged = s.detail && !item.analysisAuthorizations?.length
      ? { ...item, analysisAuthorizations: s.detail.analysisAuthorizations }
      : item;
    return {
      ...s,
      authorizationMutating: false,
      detail: merged,
      list: replaceInList(s.list, merged),
    };
  }),
  on(setAuthorizationNumberFailure, (s): AtencionFeatureState => ({ ...s, authorizationMutating: false })),

  on(setUrgentFlagSuccess, (s, { item }): AtencionFeatureState => ({
    ...s,
    detail: item,
    list: replaceInList(s.list, item),
  })),

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
    guardians: [],
  })),

  on(verifyPatient, (s): AtencionFeatureState => ({ ...s, verifyingPatient: true })),
  on(verifyPatientSuccess, (s, { patient }): AtencionFeatureState => ({ ...s, resolvedPatient: patient, verifyingPatient: false })),
  on(verifyPatientFailure, (s): AtencionFeatureState => ({ ...s, verifyingPatient: false })),

  on(loadPatientGuardians, (s): AtencionFeatureState => ({ ...s, guardiansLoading: true })),
  on(loadPatientGuardiansSuccess, (s, { guardians }): AtencionFeatureState => ({ ...s, guardians, guardiansLoading: false })),
  on(loadPatientGuardiansFailure, (s): AtencionFeatureState => ({ ...s, guardiansLoading: false })),

  on(validateBond, (s): AtencionFeatureState => ({ ...s, bondMutating: true })),
  on(validateBondSuccess, (s, { userPatientId, status }): AtencionFeatureState => ({
    ...s,
    bondMutating: false,
    guardians: s.guardians.map(g => g.userPatientId === userPatientId ? { ...g, status } : g),
  })),
  on(validateBondFailure, (s): AtencionFeatureState => ({ ...s, bondMutating: false })),

  // Cross-store: cuando el effect de pacientes confirma que la cuenta fue creada,
  // refrescamos el resolvedPatient para que el botón desaparezca y aparezca "pendiente".
  on(createPatientPortalAccountSuccess, (s, { id }): AtencionFeatureState =>
    s.resolvedPatient?.id === id
      ? { ...s, resolvedPatient: { ...s.resolvedPatient, accountStatus: 'PENDING' } }
      : s),
);

function replaceInList<T extends { id: number }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
}
