import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SucursalState, SUCURSAL_FEATURE_KEY } from './sucursal.state';

export const selectSucursalState = createFeatureSelector<SucursalState>(SUCURSAL_FEATURE_KEY);

// ──────────────────────────────────────────────────────────────────────────────
// List (existing)
// ──────────────────────────────────────────────────────────────────────────────
export const selectSucursalList = createSelector(selectSucursalState, s => s.list);
export const selectSucursalLoading = createSelector(selectSucursalState, s => s.loading);
export const selectSucursalSaving = createSelector(selectSucursalState, s => s.saving);
export const selectSucursalError = createSelector(selectSucursalState, s => s.error);

// ──────────────────────────────────────────────────────────────────────────────
// Detail
// ──────────────────────────────────────────────────────────────────────────────
export const selectCurrentSucursal = createSelector(selectSucursalState, s => s.current);
export const selectLoadingDetail = createSelector(selectSucursalState, s => s.loadingDetail);
export const selectSchedules = createSelector(selectSucursalState, s => s.schedules);
export const selectContacts = createSelector(selectSucursalState, s => s.contacts);
export const selectWorkspaces = createSelector(selectSucursalState, s => s.workspaces);
export const selectTotemConfig = createSelector(selectSucursalState, s => s.totemConfig);

// ──────────────────────────────────────────────────────────────────────────────
// Catalog
// ──────────────────────────────────────────────────────────────────────────────
export const selectAreas = createSelector(selectSucursalState, s => s.areas);
export const selectSections = createSelector(selectSucursalState, s => s.sections);
export const selectLoadingCatalog = createSelector(selectSucursalState, s => s.loadingCatalog);
export const selectSelectedAreaId = createSelector(selectSucursalState, s => s.selectedAreaId);
