import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessEffects } from './access.effects';
import { AccessApiService } from '../access-api.service';
import { loadMySections, loadMySectionsSuccess, loadMySectionsFailure } from './access.actions';

describe('AccessEffects', () => {
  let actions$: Observable<Action>;
  let api: { getMySections: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getMySections: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AccessEffects,
        provideMockActions(() => actions$),
        { provide: AccessApiService, useValue: api },
      ],
    });
  });

  it('mapea SectionResponse[] a codes en success', async () => {
    api.getMySections.mockReturnValue(of([{ code: 'RECEPCION', label: 'Atención' }, { code: 'AGENDAS', label: 'Turnos' }]));
    actions$ = of(loadMySections());
    const effects = TestBed.inject(AccessEffects);
    const action = await firstValueFrom(effects.loadMySections$);
    expect(action).toEqual(loadMySectionsSuccess({ sections: ['RECEPCION', 'AGENDAS'] }));
  });

  it('failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getMySections.mockReturnValue(throwError(() => error));
    actions$ = of(loadMySections());
    const effects = TestBed.inject(AccessEffects);
    const action = await firstValueFrom(effects.loadMySections$);
    expect(action).toEqual(loadMySectionsFailure({ error }));
  });
});
