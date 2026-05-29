import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs/operators';

import { ModuleKey } from '@core/models/module-key.enum';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { TenantConfig } from '@core/models/tenant.model';

export const moduleActiveGuard = (key: ModuleKey): CanMatchFn =>
  () => {
    const store = inject(Store);
    const router = inject(Router);
    const registry = inject(ModuleRegistry);

    return store.select(selectTenantConfig).pipe(
      filter((config): config is TenantConfig => !!config),
      take(1),
      map(() => registry.isActive(key) ? true : router.createUrlTree(['/']))
    );
  };
