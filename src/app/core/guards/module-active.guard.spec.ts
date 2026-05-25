import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { moduleActiveGuard } from './module-active.guard';
import { ModuleKey } from '@core/models/module-key.enum';
import { ModuleRegistry } from '@core/tenant/module-registry';

describe('moduleActiveGuard (async)', () => {
  let storeMock: { select: ReturnType<typeof vi.fn> };
  let registryMock: { isActive: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storeMock = { select: vi.fn() };
    registryMock = { isActive: vi.fn() };
    routerMock = { createUrlTree: vi.fn().mockReturnValue({ toString: () => '/redirect' } as any) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: storeMock },
        { provide: ModuleRegistry, useValue: registryMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('returns true when module is active', async () => {
    const config$ = new BehaviorSubject({ modules: [ModuleKey.Turnos] } as any);
    storeMock.select.mockReturnValue(config$);
    registryMock.isActive.mockReturnValue(true);

    const guardResult = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)(null as any, [] as any)
    );

    const result = await firstValueFrom(guardResult as any);
    expect(result).toBe(true);
  });

  it('returns UrlTree when module is inactive', async () => {
    const config$ = new BehaviorSubject({ modules: [] } as any);
    storeMock.select.mockReturnValue(config$);
    registryMock.isActive.mockReturnValue(false);

    const guardResult = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)(null as any, [] as any)
    );

    const result = await firstValueFrom(guardResult as any);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toBe(routerMock.createUrlTree.mock.results[0].value);
  });

  it('waits until config is non-null before emitting', async () => {
    const config$ = new BehaviorSubject<any>(null);
    storeMock.select.mockReturnValue(config$);
    registryMock.isActive.mockReturnValue(true);

    const guardResult = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)(null as any, [] as any)
    );

    let resolved = false;
    firstValueFrom(guardResult as any).then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);

    config$.next({ modules: [ModuleKey.Turnos] });
    await new Promise<void>(r => setTimeout(r, 0));
    expect(resolved).toBe(true);
  });
});
