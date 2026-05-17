import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AnaliticaState, ANALITICA_FEATURE_KEY } from './analitica.state';

export const selectAnaliticaState = createFeatureSelector<AnaliticaState>(ANALITICA_FEATURE_KEY);

export const selectAllProtocolos = createSelector(
  selectAnaliticaState,
  (state) => state.protocolos
);

export const selectAllNbus = createSelector(
  selectAnaliticaState,
  (state) => state.nbus
);

export const selectAnaliticaPending = createSelector(
  selectAnaliticaState,
  (state) => state.pending
);

export const selectAnaliticaError = createSelector(
  selectAnaliticaState,
  (state) => state.error
);
