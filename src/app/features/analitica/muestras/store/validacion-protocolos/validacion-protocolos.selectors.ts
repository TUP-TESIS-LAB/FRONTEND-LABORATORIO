import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ValidacionProtocolosState, VALIDACION_PROTOCOLOS_FEATURE_KEY } from './validacion-protocolos.state';

export const selectValidacionProtocolosState =
  createFeatureSelector<ValidacionProtocolosState>(VALIDACION_PROTOCOLOS_FEATURE_KEY);
export const selectValidacionRows = createSelector(selectValidacionProtocolosState, s => s.rows);
export const selectValidacionPending = createSelector(selectValidacionProtocolosState, s => s.pending);
export const selectValidacionError = createSelector(selectValidacionProtocolosState, s => s.error);
