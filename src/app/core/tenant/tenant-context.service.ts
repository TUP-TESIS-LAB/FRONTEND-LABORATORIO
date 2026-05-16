import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';
import { selectTenantConfig } from './store/tenant.selectors';

/**
 * Resolves the current tenant id from the store and runs an HTTP-style
 * callback against it. Throws if no tenant is loaded yet (callers are
 * expected to be reachable only after the tenant resolver has run).
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly store = inject(Store);

  withTenantId<T>(fn: (id: string) => Observable<T>): Observable<T> {
    return this.store.select(selectTenantConfig).pipe(
      take(1),
      switchMap((config) => {
        if (!config) throw new Error('Tenant context not loaded');
        return fn(config.id);
      }),
    );
  }
}
