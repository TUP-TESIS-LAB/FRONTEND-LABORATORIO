import { inject, Injectable } from '@angular/core';
import { TenantStore } from './tenant.store';
import { ModuleKey } from '@core/models/module-key.enum';

@Injectable({ providedIn: 'root' })
export class ModuleRegistry {
  private readonly store = inject(TenantStore);

  isActive(key: ModuleKey): boolean {
    return this.store.isActive(key);
  }
}
