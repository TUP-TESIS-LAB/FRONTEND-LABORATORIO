import { createReducer, on } from '@ngrx/store';
import { initialFinancieroState, FinancieroState } from './financiero.state';
import {
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivitySuccess,
  openSessionSuccess, openSessionFailure,
  closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
} from './financiero.actions';

export const initialState = initialFinancieroState;

export const financieroReducer = createReducer(
  initialState,

  // ── cargar sesión abierta ──────────────────────────────────────────────────
  on(loadOpenSession, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, loading: true, error: null },
  })),
  on(loadOpenSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, loading: false, error: null },
  })),
  on(sessionNotFound, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session: null, activity: null, loading: false, error: null },
  })),
  on(loadOpenSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, loading: false, error },
  })),

  // ── actividad de sesión ────────────────────────────────────────────────────
  on(loadActivitySuccess, (state, { activity }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, activity },
  })),

  // ── abrir sesión ───────────────────────────────────────────────────────────
  on(openSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, error: null },
  })),
  on(openSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── cerrar sesión ──────────────────────────────────────────────────────────
  on(closeSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, error: null },
  })),
  on(closeSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── registrar movimiento ───────────────────────────────────────────────────
  on(registerTransaction, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error: null },
  })),
  on(registerTransactionSuccess, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error: null },
  })),
  on(registerTransactionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),
);
