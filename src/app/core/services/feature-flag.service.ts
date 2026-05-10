import { Injectable } from '@angular/core';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  constructor(private registry: ModuleRegistry) {}

  isEnabled(key: ModuleKey): boolean {
    return this.registry.isActive(key);
  }
}
