import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FinancieroState } from './financiero.state';
import { FINANCIERO_FEATURE_KEY } from './financiero.state';

export const selectFinancieroState =
  createFeatureSelector<FinancieroState>(FINANCIERO_FEATURE_KEY);

export const selectAllPagos = createSelector(
  selectFinancieroState,
  (state) => state.pagos
);

export const selectAllCoberturas = createSelector(
  selectFinancieroState,
  (state) => state.coberturas
);

export const selectAllMovimientos = createSelector(
  selectFinancieroState,
  (state) => state.movimientos
);

export const selectFinancieroPending = createSelector(
  selectFinancieroState,
  (state) => state.pending
);

export const selectFinancieroError = createSelector(
  selectFinancieroState,
  (state) => state.error
);
