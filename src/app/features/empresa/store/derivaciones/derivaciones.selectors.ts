import { createFeatureSelector, createSelector } from '@ngrx/store';

import { DERIVACIONES_FEATURE_KEY, DerivacionesState } from './derivaciones.state';

export const selectDerivacionesState =
  createFeatureSelector<DerivacionesState>(DERIVACIONES_FEATURE_KEY);

export const selectLabs = createSelector(
  selectDerivacionesState,
  (state) => state.labs,
);

export const selectState = createSelector(
  selectDerivacionesState,
  (state) => state.state,
);

export const selectPending = createSelector(
  selectDerivacionesState,
  (state) => state.pending,
);
