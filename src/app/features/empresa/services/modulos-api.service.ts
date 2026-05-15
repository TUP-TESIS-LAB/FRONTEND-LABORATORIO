import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { ModuleCode, ModuloTenant } from '../models/modulo.model';

@Injectable({ providedIn: 'root' })
export class ModulosApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  list(): Observable<ModuloTenant[]> {
    return this.withTenantId((id) =>
      this.http.get<ModuloTenant[]>(`/api/v1/saas-admin/tenants/${id}/modules`),
    );
  }

  toggle(code: ModuleCode, enable: boolean): Observable<void> {
    return this.withTenantId((id) =>
      this.http.put<void>(`/api/v1/saas-admin/tenants/${id}/modules/${code}`, { enable }),
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
