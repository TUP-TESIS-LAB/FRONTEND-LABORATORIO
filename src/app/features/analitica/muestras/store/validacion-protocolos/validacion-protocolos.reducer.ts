import { createReducer, on } from '@ngrx/store';
import { initialValidacionProtocolosState, ValidacionProtocolosState } from './validacion-protocolos.state';
import {
  loadValidacionProtocolos,
  loadValidacionProtocolosSuccess,
  loadValidacionProtocolosFailure,
} from './validacion-protocolos.actions';

export const validacionProtocolosReducer = createReducer(
  initialValidacionProtocolosState,
  on(loadValidacionProtocolos, (s): ValidacionProtocolosState => ({ ...s, pending: true, error: null })),
  on(loadValidacionProtocolosSuccess, (s, { rows }): ValidacionProtocolosState => ({ ...s, rows, pending: false, error: null })),
  on(loadValidacionProtocolosFailure, (s, { error }): ValidacionProtocolosState => ({ ...s, pending: false, error })),
);
