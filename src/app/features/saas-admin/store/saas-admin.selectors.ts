import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SAAS_ADMIN_FEATURE_KEY, SaasAdminState } from './saas-admin.state';

export const selectSaasAdmin = createFeatureSelector<SaasAdminState>(SAAS_ADMIN_FEATURE_KEY);

export const selectTenantsList               = createSelector(selectSaasAdmin, (s) => s.tenants);
export const selectSelectedTenant            = createSelector(selectSaasAdmin, (s) => s.selectedTenant);
export const selectSelectedTenantModules     = createSelector(selectSaasAdmin, (s) => s.selectedTenantModules);
export const selectSelectedTenantWhiteLabel  = createSelector(selectSaasAdmin, (s) => s.selectedTenantWhiteLabel);
export const selectSaasAdminPending          = createSelector(selectSaasAdmin, (s) => s.pending);
export const selectSaasAdminError            = createSelector(selectSaasAdmin, (s) => s.error);

export const selectActiveTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => t.status === 'ACTIVE' && t.active && !t.deletedAt),
);
export const selectInactiveTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => t.status === 'INACTIVE' && t.active && !t.deletedAt),
);
export const selectDeletedTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => !t.active || !!t.deletedAt),
);

export const selectDashboardCounts = createSelector(
  selectTenantsList, selectActiveTenants, selectInactiveTenants, selectDeletedTenants,
  (all, active, inactive, deleted) => ({
    total: all.length, active: active.length, inactive: inactive.length, deleted: deleted.length,
  }),
);
