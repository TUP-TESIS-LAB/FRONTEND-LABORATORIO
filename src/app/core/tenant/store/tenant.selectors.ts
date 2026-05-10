import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TenantState, TENANT_FEATURE_KEY } from './tenant.state';

export const selectTenantState =
  createFeatureSelector<TenantState>(TENANT_FEATURE_KEY);

export const selectTenantConfig = createSelector(
  selectTenantState,
  state => state.config,
);

export const selectTenantPending = createSelector(
  selectTenantState,
  state => state.pending,
);

export const selectTenantError = createSelector(
  selectTenantState,
  state => state.error,
);
