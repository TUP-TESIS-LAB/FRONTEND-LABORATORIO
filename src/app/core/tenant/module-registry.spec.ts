import { TestBed } from '@angular/core/testing';
import { ModuleRegistry } from './module-registry';
import { TenantStore } from './tenant.store';
import { ModuleKey } from '@core/models/module-key.enum';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    const fakeStore = {
      isActive: (key: ModuleKey) => key === ModuleKey.Turnos,
    };
    TestBed.configureTestingModule({
      providers: [
        ModuleRegistry,
        { provide: TenantStore, useValue: fakeStore },
      ],
    });
    registry = TestBed.inject(ModuleRegistry);
  });

  it('isActive delegates to store', () => {
    expect(registry.isActive(ModuleKey.Turnos)).toBe(true);
    expect(registry.isActive(ModuleKey.Financiero)).toBe(false);
  });
});
