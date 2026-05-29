import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SucursalState, SUCURSAL_FEATURE_KEY } from './sucursal.state';

export const selectSucursalState = createFeatureSelector<SucursalState>(SUCURSAL_FEATURE_KEY);

export const selectSucursalList = createSelector(selectSucursalState, s => s.list);
export const selectSucursalLoading = createSelector(selectSucursalState, s => s.loading);
export const selectSucursalSaving = createSelector(selectSucursalState, s => s.saving);
export const selectSucursalError = createSelector(selectSucursalState, s => s.error);
