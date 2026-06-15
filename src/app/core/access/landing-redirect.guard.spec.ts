import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { landingRedirectGuard } from './landing-redirect.guard';
import { AccessState } from './store/access.state';

/**
 * El guard NUNCA debe dejar la navegación colgada: si las secciones no cargan
 * (BE caído / request al proxy colgada → loaded queda false para siempre),
 * tiene que caer al home (true) en vez de congelar el login.
 */
describe('landingRedirectGuard', () => {
  let state$: BehaviorSubject<AccessState>;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  function run(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => {
      const result = landingRedirectGuard({} as any, {} as any);
      return new Promise<boolean | UrlTree>((resolve) => {
        (result as any).subscribe((v: boolean | UrlTree) => resolve(v));
      });
    });
  }

  beforeEach(() => {
    state$ = new BehaviorSubject<AccessState>({ sections: [], loaded: false, pending: true, error: null });
    router = { createUrlTree: vi.fn((cmds: string[]) => ({ __urlTree: cmds[0] } as unknown as UrlTree)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: { select: () => state$.asObservable() } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirige a la primera sección accesible cuando ya cargó', async () => {
    state$.next({ sections: ['SUCURSALES'], loaded: true, pending: false, error: null });
    const result = await run();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/sucursales']);
    expect((result as any).__urlTree).toBe('/sucursales');
  });

  it('deja ver el home (true) si cargó pero el usuario no tiene secciones', async () => {
    state$.next({ sections: [], loaded: true, pending: false, error: null });
    const result = await run();
    expect(result).toBe(true);
  });

  it('NO se cuelga: si las secciones nunca cargan, cae al home (true) por timeout', () => {
    // loaded permanece false (request colgada). El guard debe resolver igual.
    vi.useFakeTimers();
    try {
      let resolved: boolean | UrlTree | undefined;
      TestBed.runInInjectionContext(() => {
        (landingRedirectGuard({} as any, {} as any) as any).subscribe((v: boolean | UrlTree) => (resolved = v));
      });
      expect(resolved).toBeUndefined();   // sigue esperando...
      vi.advanceTimersByTime(10_000);     // vence el timeout
      expect(resolved).toBe(true);        // cayó al home en vez de colgarse
    } finally {
      vi.useRealTimers();
    }
  });
});
