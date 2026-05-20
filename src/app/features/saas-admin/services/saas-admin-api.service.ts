// src/app/features/saas-admin/services/saas-admin-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModuleCode } from '../models/module-code';
import { CreateTenantRequest, Tenant, UpdateTenantRequest } from '../models/tenant.model';
import { TenantModule } from '../models/tenant-module.model';
import { TenantWhiteLabel, UpsertTenantWhiteLabelRequest } from '../models/tenant-white-label.model';

const BASE = '/api/v1/saas-admin';

@Injectable({ providedIn: 'root' })
export class SaasAdminApiService {
  private readonly http = inject(HttpClient);

  listTenants(): Promise<Tenant[]> {
    return firstValueFrom(this.http.get<Tenant[]>(`${BASE}/tenants`));
  }
  getTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.get<Tenant>(`${BASE}/tenants/${id}`));
  }
  createTenant(req: CreateTenantRequest): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants`, req));
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
}
