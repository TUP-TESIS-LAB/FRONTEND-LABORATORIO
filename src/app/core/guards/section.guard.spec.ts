import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { sectionGuard } from './section.guard';
import { ACCESS_FEATURE_KEY, initialAccessState } from '@core/access/store/access.state';

describe('sectionGuard', () => {
  function run(section: string, state: Partial<typeof initialAccessState>) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [ACCESS_FEATURE_KEY]: { ...initialAccessState, ...state } } }),
      ],
    });
    return TestBed.runInInjectionContext(() => sectionGuard(section as any)([] as any, [] as any));
  }

  it('permite si la seccion esta concedida y access loaded', async () => {
    const result = run('AGENDAS', { loaded: true, sections: ['AGENDAS'] as any });
    const value = isObservable(result) ? await firstValueFrom(result) : result;
    expect(value).toBe(true);
  });

  it('redirige a /home si falta la seccion', async () => {
    const result = run('AGENDAS', { loaded: true, sections: [] as any });
    const value = isObservable(result) ? await firstValueFrom(result) : result;
    expect(value instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(value as UrlTree)).toBe('/home');
  });
});
