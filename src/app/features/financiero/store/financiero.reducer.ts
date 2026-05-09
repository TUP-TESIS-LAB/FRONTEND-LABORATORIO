import { createReducer, on } from '@ngrx/store';
import { FinancieroState, initialFinancieroState } from './financiero.state';
import {
  loadPagos, loadPagosSuccess, loadPagosFailure,
  loadCoberturas, loadCoberturasSuccess, loadCoberturasFailure,
  loadMovimientos, loadMovimientosSuccess, loadMovimientosFailure,
} from './financiero.actions';

export const financieroReducer = createReducer<FinancieroState>(
  initialFinancieroState,

  // Pagos
  on(loadPagos, (state): FinancieroState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadPagosSuccess, (state, { pagos }): FinancieroState => ({
    ...state,
    pagos,
    pending: false,
    error: null,
  })),
  on(loadPagosFailure, (state, { error }): FinancieroState => ({
    ...state,
    pending: false,
    error,
  })),

  // Coberturas
  on(loadCoberturas, (state): FinancieroState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadCoberturasSuccess, (state, { coberturas }): FinancieroState => ({
    ...state,
    coberturas,
    pending: false,
    error: null,
  })),
  on(loadCoberturasFailure, (state, { error }): FinancieroState => ({
    ...state,
    pending: false,
    error,
  })),

  // Movimientos
  on(loadMovimientos, (state): FinancieroState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadMovimientosSuccess, (state, { movimientos }): FinancieroState => ({
    ...state,
    movimientos,
    pending: false,
    error: null,
  })),
  on(loadMovimientosFailure, (state, { error }): FinancieroState => ({
    ...state,
    pending: false,
    error,
  })),
);
