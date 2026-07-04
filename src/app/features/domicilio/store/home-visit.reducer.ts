import { createReducer, on } from '@ngrx/store';
import { DomicilioState, initialDomicilioState } from './home-visit.state';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
  loadMyRoute,
  loadMyRouteSuccess,
  loadMyRouteNotModified,
  loadMyRouteFailure,
  loadVisitDetail,
  loadVisitDetailSuccess,
  loadVisitDetailFailure,
  prepareLabels,
  prepareLabelsSuccess,
  prepareLabelsFailure,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
  markInTransit,
  markInTransitSuccess,
  markInTransitFailure,
  markBroken,
  markBrokenSuccess,
  markBrokenFailure,
  receiveVisit,
  receiveVisitSuccess,
  receiveVisitFailure,
  reExtractVisit,
  reExtractVisitSuccess,
  reExtractVisitFailure,
  loadCustody,
  loadCustodySuccess,
  loadCustodyNotModified,
  loadCustodyFailure,
} from './home-visit.actions';

export const homeVisitReducer = createReducer(
  initialDomicilioState,

  // ── Listar visitas ──────────────────────────────────────────────────────────
  on(loadHomeVisits, (state): DomicilioState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadHomeVisitsSuccess, (state, { visits }): DomicilioState => ({
    ...state,
    visits,
    pending: false,
    error: null,
  })),
  on(loadHomeVisitsFailure, (state, { error }): DomicilioState => ({
    ...state,
    pending: false,
    error,
  })),

  // ── Crear visita ────────────────────────────────────────────────────────────
  on(createHomeVisit, (state): DomicilioState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(createHomeVisitSuccess, (state): DomicilioState => ({
    ...state,
    pending: false,
    error: null,
  })),
  on(createHomeVisitFailure, (state, { error }): DomicilioState => ({
    ...state,
    pending: false,
    error,
  })),

  // ── Ruta del día ─────────────────────────────────────────────────────────────
  on(loadMyRoute, (state): DomicilioState => ({
    ...state,
    myRoutePending: true,
    routeError: null,
  })),
  on(loadMyRouteSuccess, (state, { visits }): DomicilioState => ({
    ...state,
    myRoute: visits,
    myRoutePending: false,
    routeError: null,
  })),
  on(loadMyRouteNotModified, (state): DomicilioState => ({
    ...state,
    myRoutePending: false,
    routeError: null,
  })),
  on(loadMyRouteFailure, (state, { error }): DomicilioState => ({
    ...state,
    myRoutePending: false,
    routeError: error,
  })),

  // ── Detalle de visita ─────────────────────────────────────────────────────────
  on(loadVisitDetail, (state): DomicilioState => ({
    ...state,
    detailPending: true,
    detailError: null,
  })),
  on(loadVisitDetailSuccess, (state, { visit }): DomicilioState => ({
    ...state,
    visitDetail: visit,
    detailPending: false,
    detailError: null,
  })),
  on(loadVisitDetailFailure, (state, { error }): DomicilioState => ({
    ...state,
    detailPending: false,
    detailError: error,
  })),

  // ── Preparar rótulos ──────────────────────────────────────────────────────────
  on(prepareLabels, (state): DomicilioState => ({
    ...state,
    actionPending: true,
  })),
  on(prepareLabelsSuccess, (state, { visit, labels }): DomicilioState => ({
    ...state,
    actionPending: false,
    visitDetail: visit,
    lastPreparedLabels: labels,
  })),
  on(prepareLabelsFailure, (state): DomicilioState => ({
    ...state,
    actionPending: false,
  })),

  // ── Acciones del extractor ────────────────────────────────────────────────────
  on(markExtracted, (state): DomicilioState => ({
    ...state,
    actionPending: true,
  })),
  on(markExtractedSuccess, (state, { visit }): DomicilioState => ({
    ...state,
    actionPending: false,
    visitDetail: visit,
  })),
  on(markExtractedFailure, (state): DomicilioState => ({
    ...state,
    actionPending: false,
  })),

  on(markOutcome, (state): DomicilioState => ({
    ...state,
    actionPending: true,
  })),
  on(markOutcomeSuccess, (state, { visit }): DomicilioState => ({
    ...state,
    actionPending: false,
    visitDetail: visit,
  })),
  on(markOutcomeFailure, (state): DomicilioState => ({
    ...state,
    actionPending: false,
  })),

  on(rescheduleVisit, (state): DomicilioState => ({
    ...state,
    actionPending: true,
  })),
  on(rescheduleVisitSuccess, (state, { visit }): DomicilioState => ({
    ...state,
    actionPending: false,
    visitDetail: visit,
  })),
  on(rescheduleVisitFailure, (state): DomicilioState => ({
    ...state,
    actionPending: false,
  })),

  // ── Transporte / recepción / rotura / re-extracción ───────────────────────────
  on(markInTransit, markBroken, receiveVisit, reExtractVisit, (state): DomicilioState => ({
    ...state,
    actionPending: true,
  })),
  on(
    markInTransitSuccess,
    markBrokenSuccess,
    receiveVisitSuccess,
    reExtractVisitSuccess,
    (state, { visit }): DomicilioState => ({
      ...state,
      actionPending: false,
      visitDetail: visit,
    }),
  ),
  on(
    markInTransitFailure,
    markBrokenFailure,
    receiveVisitFailure,
    reExtractVisitFailure,
    (state): DomicilioState => ({
      ...state,
      actionPending: false,
    }),
  ),

  // ── Cadena de custodia ────────────────────────────────────────────────────────
  on(loadCustody, (state): DomicilioState => ({
    ...state,
    custodyPending: true,
  })),
  on(loadCustodySuccess, (state, { events }): DomicilioState => ({
    ...state,
    custody: events,
    custodyPending: false,
  })),
  on(loadCustodyNotModified, (state): DomicilioState => ({
    ...state,
    custodyPending: false,
  })),
  on(loadCustodyFailure, (state): DomicilioState => ({
    ...state,
    custodyPending: false,
  })),
);
