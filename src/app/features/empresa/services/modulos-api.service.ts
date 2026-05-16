import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TenantContextService } from '@core/tenant/tenant-context.service';
import { ModuleCode, ModuloTenant } from '../models/modulo.model';

@Injectable({ providedIn: 'root' })
export class ModulosApiService {
  private readonly http = inject(HttpClient);
  private readonly tenantContext = inject(TenantContextService);

  list(): Observable<ModuloTenant[]> {
    return this.tenantContext.withTenantId((id) =>
      this.http.get<ModuloTenant[]>(`/api/v1/saas-admin/tenants/${id}/modules`),
    );
  }

  toggle(code: ModuleCode, enable: boolean): Observable<void> {
    return this.tenantContext.withTenantId((id) =>
      this.http.put<void>(`/api/v1/saas-admin/tenants/${id}/modules/${code}`, { enable }),
    );
  }
}
