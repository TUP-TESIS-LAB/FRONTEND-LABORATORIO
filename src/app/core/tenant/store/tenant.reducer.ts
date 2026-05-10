import { createReducer, on } from '@ngrx/store';
import { TenantState, initialTenantState } from './tenant.state';
import {
  loadTenantConfig,
  loadTenantConfigSuccess,
  loadTenantConfigFailure,
} from './tenant.actions';

export const tenantReducer = createReducer(
  initialTenantState,

  on(loadTenantConfig, (state): TenantState => ({
    ...state,
    pending: true,
    error: null,
  })),
  on(loadTenantConfigSuccess, (state, { config }): TenantState => ({
    ...state,
    config,
    pending: false,
    error: null,
  })),
  on(loadTenantConfigFailure, (state, { error }): TenantState => ({
    ...state,
    pending: false,
    error,
  })),
);
