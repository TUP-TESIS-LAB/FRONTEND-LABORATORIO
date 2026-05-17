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
import { SmtpConfigApiService } from '../services/smtp-config-api.service';
import { NotificationService } from '@core/services/notification.service';
import { TenantThemeService } from '@core/tenant/tenant-theme.service';

import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  loadRoles, loadRolesSuccess,
  toggleModulo, toggleModuloSuccess,
  loadSmtpConfig, loadSmtpConfigSuccess,
  saveSmtpConfig, saveSmtpConfigSuccess,
  sendTestEmail, sendTestEmailSuccess,
} from './empresa.actions';
import { initialEmpresaState } from './empresa.state';

describe('EmpresaEffects', () => {
  let actions$: Observable<Action>;
  let usuariosApi: { search: ReturnType<typeof vi.fn> };
  let rolesApi: { list: ReturnType<typeof vi.fn> };
  let modulosApi: { toggle: ReturnType<typeof vi.fn> };
  let smtpApi: {
    get: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    sendTest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    usuariosApi = { search: vi.fn() };
    rolesApi = { list: vi.fn() };
    modulosApi = { toggle: vi.fn() };
    smtpApi = { get: vi.fn(), save: vi.fn(), sendTest: vi.fn() };

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
        { provide: SmtpConfigApiService, useValue: smtpApi },
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

  it('loadSmtpConfig$ dispatches success', async () => {
    const config = { configured: false, gmailUsername: null, fromName: null, active: false, updatedAt: null };
    smtpApi.get.mockReturnValue(of(config));
    actions$ = of(loadSmtpConfig());
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.loadSmtpConfig$);
    expect(action).toEqual(loadSmtpConfigSuccess({ config }));
  });

  it('saveSmtpConfig$ dispatches success', async () => {
    const config = { configured: true, gmailUsername: 'x', fromName: null, active: true, updatedAt: null };
    smtpApi.save.mockReturnValue(of(config));
    actions$ = of(saveSmtpConfig({ payload: { gmailUsername: 'x', appPassword: 'abcdefghijklmnop' } }));
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.saveSmtpConfig$);
    expect(action).toEqual(saveSmtpConfigSuccess({ config }));
  });

  it('sendTestEmail$ dispatches success', async () => {
    const result = { delivered: true, sentAt: '2026-05-16T14:00Z' };
    smtpApi.sendTest.mockReturnValue(of(result));
    actions$ = of(sendTestEmail({ payload: { to: 'a@b.com' } }));
    const effects = TestBed.inject(EmpresaEffects);

    const action = await firstValueFrom(effects.sendTestEmail$);
    expect(action).toEqual(sendTestEmailSuccess({ result }));
  });
});
