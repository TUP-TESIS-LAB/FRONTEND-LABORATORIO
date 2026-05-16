import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TenantContextService } from '@core/tenant/tenant-context.service';
import { GuardarWhiteLabelPayload, WhiteLabel } from '../models/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelApiService {
  private readonly http = inject(HttpClient);
  private readonly tenantContext = inject(TenantContextService);

  get(): Observable<WhiteLabel> {
    return this.tenantContext.withTenantId((id) =>
      this.http.get<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`),
    );
  }

  save(payload: GuardarWhiteLabelPayload): Observable<WhiteLabel> {
    return this.tenantContext.withTenantId((id) =>
      this.http.put<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`, payload),
    );
  }
}
