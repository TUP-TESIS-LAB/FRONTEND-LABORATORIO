import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ModuleKey } from '@core/models/module-key.enum';
import { selectTenantConfig } from './store/tenant.selectors';

@Injectable({ providedIn: 'root' })
export class ModuleRegistry {
  private readonly config = inject(Store).selectSignal(selectTenantConfig);

  isActive(key: ModuleKey): boolean {
    return this.config()?.modules.includes(key) ?? false;
  }
}
