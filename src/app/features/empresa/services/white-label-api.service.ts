import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { GuardarWhiteLabelPayload, WhiteLabel } from '../models/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  get(): Observable<WhiteLabel> {
    return this.withTenantId((id) =>
      this.http.get<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`),
    );
  }

  save(payload: GuardarWhiteLabelPayload): Observable<WhiteLabel> {
    return this.withTenantId((id) =>
      this.http.put<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`, payload),
    );
  }

  private withTenantId<T>(fn: (id: number) => Observable<T>): Observable<T> {
    return this.store.select(selectTenantConfig).pipe(
      take(1),
      switchMap((config) => {
        if (!config) throw new Error('Tenant context not loaded');
        return fn((config as unknown as { id: number }).id);
      }),
    );
  }
}
