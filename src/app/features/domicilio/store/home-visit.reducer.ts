import { createReducer, on } from '@ngrx/store';
import { DomicilioState, initialDomicilioState } from './home-visit.state';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
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
);
