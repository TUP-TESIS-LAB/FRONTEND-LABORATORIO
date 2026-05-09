import { createReducer, on } from '@ngrx/store';
import { AnaliticaState, initialAnaliticaState } from './analitica.state';
import {
  loadPacientes, loadPacientesSuccess, loadPacientesFailure,
  loadProtocolos, loadProtocolosSuccess, loadProtocolosFailure,
  loadNbus, loadNbusSuccess, loadNbusFailure,
} from './analitica.actions';

export const analiticaReducer = createReducer(
  initialAnaliticaState,

  // Pacientes
  on(loadPacientes, (state): AnaliticaState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadPacientesSuccess, (state, { pacientes }): AnaliticaState => ({
    ...state,
    pacientes,
    pending: false,
    error: null,
  })),
  on(loadPacientesFailure, (state, { error }): AnaliticaState => ({
    ...state,
    pending: false,
    error,
  })),

  // Protocolos
  on(loadProtocolos, (state): AnaliticaState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadProtocolosSuccess, (state, { protocolos }): AnaliticaState => ({
    ...state,
    protocolos,
    pending: false,
    error: null,
  })),
  on(loadProtocolosFailure, (state, { error }): AnaliticaState => ({
    ...state,
    pending: false,
    error,
  })),

  // Nbus
  on(loadNbus, (state): AnaliticaState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadNbusSuccess, (state, { nbus }): AnaliticaState => ({
    ...state,
    nbus,
    pending: false,
    error: null,
  })),
  on(loadNbusFailure, (state, { error }): AnaliticaState => ({
    ...state,
    pending: false,
    error,
  })),
);
