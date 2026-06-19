import { createReducer, on } from '@ngrx/store';
import { initialFinancieroState, FinancieroState } from './financiero.state';
import {
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivitySuccess,
  openSessionSuccess, openSessionFailure,
  closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, loadPaymentSuccess, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  loadFiscalConfig, loadFiscalConfigSuccess, loadFiscalConfigFailure,
  saveFiscalConfig, saveFiscalConfigSuccess, saveFiscalConfigFailure,
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

  // ── cobros: listar pagos ───────────────────────────────────────────────────
  on(loadPayments, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(loadPaymentsSuccess, (state, { items }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, list: items, loading: false, error: null },
  })),
  on(loadPaymentsFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── cobros: detalle de pago ────────────────────────────────────────────────
  on(loadPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(loadPaymentSuccess, (state, { payment }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, selected: payment, loading: false, error: null },
  })),
  on(loadPaymentFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── cobros: cancelar pago ──────────────────────────────────────────────────
  on(cancelPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(cancelPaymentSuccess, (state, { payment }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, selected: payment, loading: false, error: null },
  })),
  on(cancelPaymentFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── config fiscal: cargar ──────────────────────────────────────────────────
  on(loadFiscalConfig, (state): FinancieroState => ({
    ...state,
    config: { ...state.config, error: null },
  })),
  on(loadFiscalConfigSuccess, (state, { config }): FinancieroState => ({
    ...state,
    config: { ...state.config, current: config, error: null },
  })),
  on(loadFiscalConfigFailure, (state, { error }): FinancieroState => ({
    ...state,
    config: { ...state.config, error },
  })),

  // ── config fiscal: guardar ─────────────────────────────────────────────────
  on(saveFiscalConfig, (state): FinancieroState => ({
    ...state,
    config: { ...state.config, saving: true, error: null },
  })),
  on(saveFiscalConfigSuccess, (state, { config }): FinancieroState => ({
    ...state,
    config: { ...state.config, current: config, saving: false, error: null },
  })),
  on(saveFiscalConfigFailure, (state, { error }): FinancieroState => ({
    ...state,
    config: { ...state.config, saving: false, error },
  })),
);
