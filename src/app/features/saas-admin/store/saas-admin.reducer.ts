import { createReducer, on } from '@ngrx/store';
import * as A from './saas-admin.actions';
import { initialSaasAdminState, SaasAdminState } from './saas-admin.state';

function pendingOn(state: SaasAdminState): SaasAdminState {
  return { ...state, pending: true, error: null };
}

export const saasAdminReducer = createReducer<SaasAdminState>(
  initialSaasAdminState,

  // List
  on(A.loadTenants, pendingOn),
  on(A.loadTenantsSuccess, (state, { tenants }) => ({ ...state, tenants, pending: false })),
  on(A.loadTenantsFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Detail
  on(A.loadTenant, pendingOn),
  on(A.loadTenantSuccess, (state, { tenant }) => ({ ...state, selectedTenant: tenant, pending: false })),
  on(A.loadTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),
  on(A.clearSelectedTenant, (state) => ({
    ...state,
    selectedTenant: null,
    selectedTenantModules: null,
    selectedTenantWhiteLabel: null,
    selectedTenantFiscalConfig: null,
  })),

  // Create
  on(A.createTenant, pendingOn),
  on(A.createTenantSuccess, (state, { tenant }) => ({ ...state, tenants: [tenant, ...state.tenants], pending: false })),
  on(A.createTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Rename
  on(A.renameTenant, pendingOn),
  on(A.renameTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.renameTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Activate
  on(A.activateTenant, pendingOn),
  on(A.activateTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.activateTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Deactivate
  on(A.deactivateTenant, pendingOn),
  on(A.deactivateTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.deactivateTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Soft delete
  on(A.softDeleteTenant, pendingOn),
  on(A.softDeleteTenantSuccess, (state, { id }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) =>
      t.id === id ? { ...t, active: false, deletedAt: new Date().toISOString() } : t,
    ),
  })),
  on(A.softDeleteTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Modules
  on(A.loadTenantModules, pendingOn),
  on(A.loadTenantModulesSuccess, (state, { modules }) => ({
    ...state,
    pending: false,
    selectedTenantModules: modules.filter((m) => m.enabled).map((m) => m.moduleCode),
  })),
  on(A.loadTenantModulesFailure, (state, { error }) => ({ ...state, pending: false, error })),

  on(A.toggleTenantModule, pendingOn),
  on(A.toggleTenantModuleSuccess, (state, { code, enabled }) => {
    const current = state.selectedTenantModules ?? [];
    const next = enabled ? Array.from(new Set([...current, code])) : current.filter((c) => c !== code);
    return { ...state, pending: false, selectedTenantModules: next };
  }),
  on(A.toggleTenantModuleFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // White-label
  on(A.loadTenantWhiteLabel, pendingOn),
  on(A.loadTenantWhiteLabelSuccess, (state, { whiteLabel }) => ({ ...state, pending: false, selectedTenantWhiteLabel: whiteLabel })),
  on(A.loadTenantWhiteLabelFailure, (state, { error }) => ({ ...state, pending: false, error })),

  on(A.upsertTenantWhiteLabel, pendingOn),
  on(A.upsertTenantWhiteLabelSuccess, (state, { whiteLabel }) => ({ ...state, pending: false, selectedTenantWhiteLabel: whiteLabel })),
  on(A.upsertTenantWhiteLabelFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Fiscal config
  on(A.loadTenantFiscalConfig, pendingOn),
  on(A.loadTenantFiscalConfigSuccess, (state, { fiscalConfig }) => ({ ...state, pending: false, selectedTenantFiscalConfig: fiscalConfig })),
  on(A.loadTenantFiscalConfigFailure, (state, { error }) => ({ ...state, pending: false, error })),

  on(A.upsertTenantFiscalConfig, pendingOn),
  on(A.upsertTenantFiscalConfigSuccess, (state, { fiscalConfig }) => ({ ...state, pending: false, selectedTenantFiscalConfig: fiscalConfig })),
  on(A.upsertTenantFiscalConfigFailure, (state, { error }) => ({ ...state, pending: false, error })),
);
