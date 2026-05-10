import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

export const moduleActiveGuard = (key: ModuleKey): CanMatchFn =>
  () => {
    if (inject(ModuleRegistry).isActive(key)) return true;
    return inject(Router).createUrlTree(['/']);
  };
