import { createReducer, on } from '@ngrx/store';
import { AnaliticaState, initialAnaliticaState } from './analitica.state';
import {
  loadProtocolos, loadProtocolosSuccess, loadProtocolosFailure,
} from './analitica.actions';

export const analiticaReducer = createReducer(
  initialAnaliticaState,

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
);
