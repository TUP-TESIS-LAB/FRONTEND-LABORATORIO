import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Action } from '@ngrx/store';

import { EmpresaEffects } from './empresa.effects';
import { UsuariosApiService } from '../services/usuarios-api.service';
import { RolesApiService } from '../services/roles-api.service';
import { AuthAdminApiService } from '../services/auth-admin-api.service';
import { WhiteLabelApiService } from '../services/white-label-api.service';
import { ModulosApiService } from '../services/modulos-api.service';
import { NotificationService } from '@core/services/notification.service';
import { TenantThemeService } from '@core/tenant/tenant-theme.service';

import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  loadRoles, loadRolesSuccess,
  toggleModulo, toggleModuloSuccess,
} from './empresa.actions';
import { initialEmpresaState } from './empresa.state';

describe('EmpresaEffects', () => {
  let actions$: Observable<Action>;
  let usuariosApi: { search: ReturnType<typeof vi.fn> };
  let rolesApi: { list: ReturnType<typeof vi.fn> };
  let modulosApi: { toggle: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    usuariosApi = { search: vi.fn() };
    rolesApi = { list: vi.fn() };
    modulosApi = { toggle: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        EmpresaEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { empresa: initialEmpresaState, tenant: { config: null } } }),
        { provide: UsuariosApiService, useValue: usuariosApi },
        { provide: RolesApiService, useValue: rolesApi },
        { provide: AuthAdminApiService, useValue: { resendEmailVerification: vi.fn(), generateFirstLoginToken: vi.fn() } },
        { provide: WhiteLabelApiService, useValue: { get: vi.fn(), save: vi.fn() } },
        { provide: ModulosApiService, useValue: modulosApi },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: TenantThemeService, useValue: { applyTheme: vi.fn() } },
      ],
    });
  });

  it('loadUsuarios success', async () => {
    const result = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
    usuariosApi.search.mockReturnValue(of(result));
    actions$ = of(loadUsuarios({ filters: {} }));
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.loadUsuarios$);
    expect(action).toEqual(loadUsuariosSuccess({ result }));
  });

  it('loadUsuarios failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    usuariosApi.search.mockReturnValue(throwError(() => error));
    actions$ = of(loadUsuarios({ filters: {} }));
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.loadUsuarios$);
    expect(action).toEqual(loadUsuariosFailure({ error }));
  });

  it('loadRoles success', async () => {
    const roles = [{ id: 1, code: 'ADMIN', description: 'd', hierarchy: 1 }];
    rolesApi.list.mockReturnValue(of(roles));
    actions$ = of(loadRoles());
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.loadRoles$);
    expect(action).toEqual(loadRolesSuccess({ roles }));
  });

  it('toggleModulo success', async () => {
    modulosApi.toggle.mockReturnValue(of(undefined));
    actions$ = of(toggleModulo({ code: 'PORTAL', enable: true }));
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.toggleModulo$);
    expect(action).toEqual(toggleModuloSuccess({ code: 'PORTAL', enable: true }));
  });
});
