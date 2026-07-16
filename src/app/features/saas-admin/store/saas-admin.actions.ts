import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Tenant, CreateTenantRequest, CreateTenantResponse, UpdateTenantRequest } from '../models/tenant.model';
import { TenantModule } from '../models/tenant-module.model';
import { TenantWhiteLabel, UpsertTenantWhiteLabelRequest } from '../models/tenant-white-label.model';
import { ModuleCode } from '../models/module-code';

// --- Tenants list ---
export const loadTenants = createAction('[SaaS Admin] Load Tenants');
export const loadTenantsSuccess = createAction('[SaaS Admin API] Load Tenants Success', props<{ tenants: Tenant[] }>());
export const loadTenantsFailure = createAction('[SaaS Admin API] Load Tenants Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant detail ---
export const loadTenant = createAction('[SaaS Admin] Load Tenant', props<{ id: number }>());
export const loadTenantSuccess = createAction('[SaaS Admin API] Load Tenant Success', props<{ tenant: Tenant }>());
export const loadTenantFailure = createAction('[SaaS Admin API] Load Tenant Failure', props<{ error: HttpErrorResponse }>());
export const clearSelectedTenant = createAction('[SaaS Admin] Clear Selected Tenant');

// --- Create tenant ---
export const createTenant = createAction('[SaaS Admin] Create Tenant', props<{ req: CreateTenantRequest }>());
export const createTenantSuccess = createAction(
  '[SaaS Admin API] Create Tenant Success',
  props<{ tenant: CreateTenantResponse }>(),
);
export const createTenantFailure = createAction('[SaaS Admin API] Create Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Rename tenant ---
export const renameTenant = createAction('[SaaS Admin] Rename Tenant', props<{ id: number; req: UpdateTenantRequest }>());
export const renameTenantSuccess = createAction('[SaaS Admin API] Rename Tenant Success', props<{ tenant: Tenant }>());
export const renameTenantFailure = createAction('[SaaS Admin API] Rename Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Activate / Deactivate tenant ---
export const activateTenant = createAction('[SaaS Admin] Activate Tenant', props<{ id: number }>());
export const activateTenantSuccess = createAction('[SaaS Admin API] Activate Tenant Success', props<{ tenant: Tenant }>());
export const activateTenantFailure = createAction('[SaaS Admin API] Activate Tenant Failure', props<{ error: HttpErrorResponse }>());

export const deactivateTenant = createAction('[SaaS Admin] Deactivate Tenant', props<{ id: number }>());
export const deactivateTenantSuccess = createAction('[SaaS Admin API] Deactivate Tenant Success', props<{ tenant: Tenant }>());
export const deactivateTenantFailure = createAction('[SaaS Admin API] Deactivate Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Soft delete tenant ---
export const softDeleteTenant = createAction('[SaaS Admin] Soft Delete Tenant', props<{ id: number }>());
export const softDeleteTenantSuccess = createAction('[SaaS Admin API] Soft Delete Tenant Success', props<{ id: number }>());
export const softDeleteTenantFailure = createAction('[SaaS Admin API] Soft Delete Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant modules ---
export const loadTenantModules = createAction('[SaaS Admin] Load Tenant Modules', props<{ tenantId: number }>());
export const loadTenantModulesSuccess = createAction('[SaaS Admin API] Load Tenant Modules Success', props<{ tenantId: number; modules: TenantModule[] }>());
export const loadTenantModulesFailure = createAction('[SaaS Admin API] Load Tenant Modules Failure', props<{ error: HttpErrorResponse }>());

export const toggleTenantModule = createAction('[SaaS Admin] Toggle Tenant Module', props<{ tenantId: number; code: ModuleCode; enable: boolean }>());
export const toggleTenantModuleSuccess = createAction('[SaaS Admin API] Toggle Tenant Module Success', props<{ tenantId: number; code: ModuleCode; enabled: boolean }>());
export const toggleTenantModuleFailure = createAction('[SaaS Admin API] Toggle Tenant Module Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant white-label ---
export const loadTenantWhiteLabel = createAction('[SaaS Admin] Load Tenant White Label', props<{ tenantId: number }>());
export const loadTenantWhiteLabelSuccess = createAction('[SaaS Admin API] Load Tenant White Label Success', props<{ whiteLabel: TenantWhiteLabel }>());
export const loadTenantWhiteLabelFailure = createAction('[SaaS Admin API] Load Tenant White Label Failure', props<{ error: HttpErrorResponse }>());

export const upsertTenantWhiteLabel = createAction('[SaaS Admin] Upsert Tenant White Label', props<{ tenantId: number; req: UpsertTenantWhiteLabelRequest }>());
export const upsertTenantWhiteLabelSuccess = createAction('[SaaS Admin API] Upsert Tenant White Label Success', props<{ whiteLabel: TenantWhiteLabel }>());
export const upsertTenantWhiteLabelFailure = createAction('[SaaS Admin API] Upsert Tenant White Label Failure', props<{ error: HttpErrorResponse }>());
