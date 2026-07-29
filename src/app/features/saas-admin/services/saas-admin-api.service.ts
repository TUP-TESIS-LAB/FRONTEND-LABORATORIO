// src/app/features/saas-admin/services/saas-admin-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModuleCode } from '../models/module-code';
import { CreateTenantRequest, CreateTenantResponse, Tenant, UpdateTenantRequest } from '../models/tenant.model';
import { TenantModule } from '../models/tenant-module.model';
import { TenantWhiteLabel, UpsertTenantWhiteLabelRequest } from '../models/tenant-white-label.model';
import { TenantFiscalConfig, UpsertTenantFiscalConfigRequest } from '../models/tenant-fiscal-config.model';
import { NbuCatalogBulkResult, NbuCatalogSummary } from '../models/nbu-catalog.model';

const BASE = '/api/v1/saas-admin';
// La identidad fiscal vive en el módulo financiero, no en saas-admin: la URL es de
// financiero, el código (y el rol SAAS_ADMIN que la protege) es de esta feature.
const FISCAL_CONFIG_BASE = '/api/v1/financiero/tenant/fiscal-config';

@Injectable({ providedIn: 'root' })
export class SaasAdminApiService {
  private readonly http = inject(HttpClient);

  listTenants(): Promise<Tenant[]> {
    return firstValueFrom(this.http.get<Tenant[]>(`${BASE}/tenants`));
  }
  getTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.get<Tenant>(`${BASE}/tenants/${id}`));
  }
  createTenant(req: CreateTenantRequest): Promise<CreateTenantResponse> {
    return firstValueFrom(this.http.post<CreateTenantResponse>(`${BASE}/tenants`, req));
  }
  renameTenant(id: number, req: UpdateTenantRequest): Promise<Tenant> {
    return firstValueFrom(this.http.put<Tenant>(`${BASE}/tenants/${id}`, req));
  }
  activateTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants/${id}/activate`, {}));
  }
  deactivateTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants/${id}/deactivate`, {}));
  }
  softDeleteTenant(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${BASE}/tenants/${id}`));
  }

  listTenantModules(id: number): Promise<TenantModule[]> {
    return firstValueFrom(this.http.get<TenantModule[]>(`${BASE}/tenants/${id}/modules`));
  }
  toggleTenantModule(id: number, code: ModuleCode, enable: boolean): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${BASE}/tenants/${id}/modules/${code}`, { enable }));
  }

  getTenantWhiteLabel(id: number): Promise<TenantWhiteLabel> {
    return firstValueFrom(this.http.get<TenantWhiteLabel>(`${BASE}/tenants/${id}/white-label`));
  }
  upsertTenantWhiteLabel(id: number, req: UpsertTenantWhiteLabelRequest): Promise<TenantWhiteLabel> {
    return firstValueFrom(this.http.put<TenantWhiteLabel>(`${BASE}/tenants/${id}/white-label`, req));
  }

  getTenantFiscalConfig(tenantId: number): Promise<TenantFiscalConfig> {
    return firstValueFrom(this.http.get<TenantFiscalConfig>(`${FISCAL_CONFIG_BASE}/${tenantId}`));
  }
  upsertTenantFiscalConfig(req: UpsertTenantFiscalConfigRequest): Promise<TenantFiscalConfig> {
    return firstValueFrom(this.http.post<TenantFiscalConfig>(FISCAL_CONFIG_BASE, req));
  }

  // --- Catálogo NBU (KAN-257) ---
  nbuCatalogSummary(tenantId: number): Promise<NbuCatalogSummary> {
    return firstValueFrom(this.http.get<NbuCatalogSummary>(`${BASE}/tenants/${tenantId}/nbu-catalog/summary`));
  }
  activateAllNbuCatalog(tenantId: number): Promise<NbuCatalogBulkResult> {
    return firstValueFrom(this.http.post<NbuCatalogBulkResult>(`${BASE}/tenants/${tenantId}/nbu-catalog/activate-all`, {}));
  }
  deactivateAllNbuCatalog(tenantId: number): Promise<NbuCatalogBulkResult> {
    return firstValueFrom(this.http.post<NbuCatalogBulkResult>(`${BASE}/tenants/${tenantId}/nbu-catalog/deactivate-all`, {}));
  }
}
