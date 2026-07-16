import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SucursalesState, SUCURSALES_FEATURE_KEY } from './sucursales.state';

export const selectSucursalesState =
  createFeatureSelector<SucursalesState>(SUCURSALES_FEATURE_KEY);

export const selectAllSucursales = createSelector(
  selectSucursalesState,
  state => state.sucursales
);

export const selectAllAreas = createSelector(
  selectSucursalesState,
  state => state.areas
);

export const selectSucursalesPending = createSelector(
  selectSucursalesState,
  state => state.pending
);

export const selectSucursalesError = createSelector(
  selectSucursalesState,
  state => state.error
);
