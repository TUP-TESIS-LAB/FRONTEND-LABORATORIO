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
);
