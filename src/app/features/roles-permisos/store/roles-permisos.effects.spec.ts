import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';

import { RolesPermisosEffects } from './roles-permisos.effects';
import { RolesPermisosApiService } from '../services/roles-permisos-api.service';
import { NotificationService } from '@core/services/notification.service';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalog, loadCatalogSuccess, loadUserSections, loadUserSectionsSuccess,
  saveUserSections, saveUserSectionsSuccess,
} from './roles-permisos.actions';

describe('RolesPermisosEffects', () => {
  let actions$: Observable<Action>;
  let api: { getGrantable: ReturnType<typeof vi.fn>; getUserSections: ReturnType<typeof vi.fn>; setUserSections: ReturnType<typeof vi.fn> };

  function configure(state = initialRolesPermisosState) {
    api = { getGrantable: vi.fn(), getUserSections: vi.fn(), setUserSections: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        RolesPermisosEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [ROLES_PERMISOS_FEATURE_KEY]: state } }),
        { provide: RolesPermisosApiService, useValue: api },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  }

  it('loadCatalog success', async () => {
    configure();
    api.getGrantable.mockReturnValue(of([{ code: 'AGENDAS', label: 'Turnos' }]));
    actions$ = of(loadCatalog());
    const effects = TestBed.inject(RolesPermisosEffects);
    expect(await firstValueFrom(effects.loadCatalog$)).toEqual(loadCatalogSuccess({ catalog: [{ code: 'AGENDAS', label: 'Turnos' }] }));
  });

  it('loadUserSections mapea a codes', async () => {
    configure();
    api.getUserSections.mockReturnValue(of([{ code: 'RECEPCION', label: 'Atención' }]));
    actions$ = of(loadUserSections({ userId: 7 }));
    const effects = TestBed.inject(RolesPermisosEffects);
    expect(await firstValueFrom(effects.loadUserSections$)).toEqual(loadUserSectionsSuccess({ sections: ['RECEPCION'] }));
  });

  it('saveUserSections usa selectedUserId+workingSet del store', async () => {
    configure({ ...initialRolesPermisosState, selectedUserId: 7, workingSet: ['RECEPCION', 'AGENDAS'] });
    api.setUserSections.mockReturnValue(of(undefined));
    actions$ = of(saveUserSections());
    const effects = TestBed.inject(RolesPermisosEffects);
    const action = await firstValueFrom(effects.saveUserSections$);
    expect(api.setUserSections).toHaveBeenCalledWith(7, ['RECEPCION', 'AGENDAS']);
    expect(action).toEqual(saveUserSectionsSuccess({ sections: ['RECEPCION', 'AGENDAS'] }));
  });
});
