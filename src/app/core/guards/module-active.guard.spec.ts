import { TestBed } from '@angular/core/testing';
import { moduleActiveGuard } from './module-active.guard';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { Router } from '@angular/router';

describe('moduleActiveGuard', () => {
  let registry: { isActive: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    registry = { isActive: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ModuleRegistry, useValue: registry },
        { provide: Router, useValue: { createUrlTree: (c: unknown[]) => c, navigate: vi.fn() } },
      ],
    });
  });

  it('should allow when module is active', () => {
    registry.isActive.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)({} as any, {} as any),
    );
    expect(result).toBe(true);
  });

  it('should redirect to / when module is inactive', () => {
    registry.isActive.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)({} as any, {} as any),
    );
    expect(result).toEqual(['/']);
  });
});
