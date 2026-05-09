import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { ModuleRegistry } from './module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { TenantConfig } from '@core/models/tenant.model';
import { signal } from '@angular/core';
import { selectTenantConfig } from './store/tenant.selectors';

const MOCK_CONFIG: TenantConfig = {
  id: 'lab1',
  name: 'Lab',
  logoUrl: '',
  brandPrimary: '#000',
  brandSecondary: '#000',
  brandAccent: '#000',
  modules: [ModuleKey.Turnos],
};

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  function setup(config: TenantConfig | null) {
    const configSignal = signal(config);
    const fakeStore = { selectSignal: (_selector: unknown) => configSignal };

    TestBed.configureTestingModule({
      providers: [
        ModuleRegistry,
        { provide: Store, useValue: fakeStore },
      ],
    });
    registry = TestBed.inject(ModuleRegistry);
  }

  it('isActive returns true for a module in config', () => {
    setup(MOCK_CONFIG);
    expect(registry.isActive(ModuleKey.Turnos)).toBe(true);
  });

  it('isActive returns false for a module not in config', () => {
    setup(MOCK_CONFIG);
    expect(registry.isActive(ModuleKey.Financiero)).toBe(false);
  });

  it('isActive returns false when config is null', () => {
    setup(null);
    expect(registry.isActive(ModuleKey.Turnos)).toBe(false);
  });
});
