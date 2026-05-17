import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError, concatMap, exhaustMap, map, of, switchMap, withLatestFrom,
} from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { TenantThemeService } from '@core/tenant/tenant-theme.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { selectUsuariosFilters } from './empresa.selectors';

import { UsuariosApiService } from '../services/usuarios-api.service';
import { RolesApiService } from '../services/roles-api.service';
import { AuthAdminApiService } from '../services/auth-admin-api.service';
import { WhiteLabelApiService } from '../services/white-label-api.service';
import { ModulosApiService } from '../services/modulos-api.service';
import { SmtpConfigApiService } from '../services/smtp-config-api.service';

import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  loadUsuario, loadUsuarioSuccess, loadUsuarioFailure,
  addUsuario, addUsuarioSuccess, addUsuarioFailure,
  updateUsuario, updateUsuarioSuccess, updateUsuarioFailure,
  toggleUsuarioStatus, toggleUsuarioStatusSuccess, toggleUsuarioStatusFailure,
  resendUsuarioInvite, resendUsuarioInviteSuccess, resendUsuarioInviteFailure,
  regenerateFirstLoginToken, regenerateFirstLoginTokenSuccess, regenerateFirstLoginTokenFailure,
  loadRoles, loadRolesSuccess, loadRolesFailure,
  loadWhiteLabel, loadWhiteLabelSuccess, loadWhiteLabelFailure,
  saveWhiteLabel, saveWhiteLabelSuccess, saveWhiteLabelFailure,
  loadModulos, loadModulosSuccess, loadModulosFailure,
  toggleModulo, toggleModuloSuccess, toggleModuloFailure,
  loadSmtpConfig, loadSmtpConfigSuccess, loadSmtpConfigFailure,
  saveSmtpConfig, saveSmtpConfigSuccess, saveSmtpConfigFailure,
  sendTestEmail, sendTestEmailSuccess, sendTestEmailFailure,
} from './empresa.actions';

@Injectable()
export class EmpresaEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);
  private readonly tenantTheme = inject(TenantThemeService);

  private readonly usuariosApi = inject(UsuariosApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly authAdminApi = inject(AuthAdminApiService);
  private readonly whiteLabelApi = inject(WhiteLabelApiService);
  private readonly modulosApi = inject(ModulosApiService);
  private readonly smtpApi = inject(SmtpConfigApiService);

  // ---- Usuarios ----
  loadUsuarios$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsuarios),
      switchMap(({ filters }) =>
        this.usuariosApi.search(filters).pipe(
          map((result) => loadUsuariosSuccess({ result })),
          catchError((error: HttpErrorResponse) => of(loadUsuariosFailure({ error }))),
        ),
      ),
    ),
  );

  /** Re-fetch when filters change. */
  setFiltersPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setUsuariosFilters),
      withLatestFrom(this.store.select(selectUsuariosFilters)),
      map(([, filters]) => loadUsuarios({ filters })),
    ),
  );

  loadUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsuario),
      switchMap(({ id }) =>
        this.usuariosApi.getById(id).pipe(
          map((usuario) => loadUsuarioSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(loadUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  addUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addUsuario),
      exhaustMap(({ payload }) =>
        this.usuariosApi.create(payload).pipe(
          map((result) => addUsuarioSuccess({ result })),
          catchError((error: HttpErrorResponse) => of(addUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  addUsuarioSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addUsuarioSuccess),
        map(() => this.notifications.success('Invitación enviada al email del usuario')),
      ),
    { dispatch: false },
  );

  /** After creating a user, refetch the current page so the list and total
   *  reflect the server's truth (avoids inserting a new user into a paginated
   *  view where it doesn't belong by sort order or page boundary). */
  refreshUsuariosOnAdd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addUsuarioSuccess),
      withLatestFrom(this.store.select(selectUsuariosFilters)),
      map(([, filters]) => loadUsuarios({ filters })),
    ),
  );

  updateUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateUsuario),
      exhaustMap(({ id, payload }) =>
        this.usuariosApi.update(id, payload).pipe(
          map((usuario) => updateUsuarioSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(updateUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  toggleUsuarioStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleUsuarioStatus),
      concatMap(({ id, payload }) =>
        this.usuariosApi.toggleStatus(id, payload).pipe(
          map((usuario) => toggleUsuarioStatusSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(toggleUsuarioStatusFailure({ error }))),
        ),
      ),
    ),
  );

  resendInvite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resendUsuarioInvite),
      concatMap(({ userId }) =>
        this.authAdminApi.resendEmailVerification(userId).pipe(
          map(() => resendUsuarioInviteSuccess({ userId })),
          catchError((error: HttpErrorResponse) => of(resendUsuarioInviteFailure({ error }))),
        ),
      ),
    ),
  );

  resendInviteToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(resendUsuarioInviteSuccess),
        map(() => this.notifications.success('Email de verificación reenviado')),
      ),
    { dispatch: false },
  );

  regenerateToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(regenerateFirstLoginToken),
      concatMap(({ userId }) =>
        this.authAdminApi.generateFirstLoginToken(userId).pipe(
          map((token) => regenerateFirstLoginTokenSuccess({ userId, token })),
          catchError((error: HttpErrorResponse) =>
            of(regenerateFirstLoginTokenFailure({ error })),
          ),
        ),
      ),
    ),
  );

  regenerateTokenToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(regenerateFirstLoginTokenSuccess),
        map(() =>
          this.notifications.success('Nuevo token de primer login generado'),
        ),
      ),
    { dispatch: false },
  );

  // ---- Roles ----
  loadRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRoles),
      switchMap(() =>
        this.rolesApi.list().pipe(
          map((roles) => loadRolesSuccess({ roles })),
          catchError((error: HttpErrorResponse) => of(loadRolesFailure({ error }))),
        ),
      ),
    ),
  );

  // ---- White label ----
  loadWhiteLabel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadWhiteLabel),
      switchMap(() =>
        this.whiteLabelApi.get().pipe(
          map((whiteLabel) => loadWhiteLabelSuccess({ whiteLabel })),
          catchError((error: HttpErrorResponse) => of(loadWhiteLabelFailure({ error }))),
        ),
      ),
    ),
  );

  saveWhiteLabel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveWhiteLabel),
      exhaustMap(({ payload }) =>
        this.whiteLabelApi.save(payload).pipe(
          map((whiteLabel) => saveWhiteLabelSuccess({ whiteLabel })),
          catchError((error: HttpErrorResponse) => of(saveWhiteLabelFailure({ error }))),
        ),
      ),
    ),
  );

  /** After save, reapply theme so sidebar/topbar refresh without reload. */
  applyThemeAfterSave$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveWhiteLabelSuccess),
        withLatestFrom(this.store.select(selectTenantConfig)),
        map(([{ whiteLabel }, tenantCfg]) => {
          if (!tenantCfg) return;
          this.tenantTheme.applyTheme({
            ...tenantCfg,
            brandPrimary: whiteLabel.primaryColor,
            brandSecondary: whiteLabel.secondaryColor,
          });
        }),
      ),
    { dispatch: false },
  );

  saveWhiteLabelToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveWhiteLabelSuccess),
        map(() => this.notifications.success('Identidad visual actualizada')),
      ),
    { dispatch: false },
  );

  // ---- Modulos ----
  loadModulos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadModulos),
      switchMap(() =>
        this.modulosApi.list().pipe(
          map((modulos) => loadModulosSuccess({ modulos })),
          catchError((error: HttpErrorResponse) => of(loadModulosFailure({ error }))),
        ),
      ),
    ),
  );

  toggleModulo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleModulo),
      concatMap(({ code, enable }) =>
        this.modulosApi.toggle(code, enable).pipe(
          map(() => toggleModuloSuccess({ code, enable })),
          catchError((error: HttpErrorResponse) => of(toggleModuloFailure({ error }))),
        ),
      ),
    ),
  );

  // ---- SMTP ----
  loadSmtpConfig$ = createEffect(() => this.actions$.pipe(
    ofType(loadSmtpConfig),
    exhaustMap(() => this.smtpApi.get().pipe(
      map(config => loadSmtpConfigSuccess({ config })),
      catchError((error: HttpErrorResponse) => of(loadSmtpConfigFailure({ error }))),
    )),
  ));

  saveSmtpConfig$ = createEffect(() => this.actions$.pipe(
    ofType(saveSmtpConfig),
    exhaustMap(({ payload }) => this.smtpApi.save(payload).pipe(
      map(config => saveSmtpConfigSuccess({ config })),
      catchError((error: HttpErrorResponse) => of(saveSmtpConfigFailure({ error }))),
    )),
  ));

  sendTestEmail$ = createEffect(() => this.actions$.pipe(
    ofType(sendTestEmail),
    exhaustMap(({ payload }) => this.smtpApi.sendTest(payload).pipe(
      map(result => sendTestEmailSuccess({ result })),
      catchError((error: HttpErrorResponse) => of(sendTestEmailFailure({ error }))),
    )),
  ));

  // ---- Global error toast ----
  /** Cualquier *Failure del feature dispara un toast con el mensaje del back. */
  globalFailureToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          loadUsuariosFailure, loadUsuarioFailure,
          addUsuarioFailure, updateUsuarioFailure, toggleUsuarioStatusFailure,
          resendUsuarioInviteFailure, regenerateFirstLoginTokenFailure,
          loadRolesFailure,
          loadWhiteLabelFailure, saveWhiteLabelFailure,
          loadModulosFailure, toggleModuloFailure,
          loadSmtpConfigFailure, saveSmtpConfigFailure, sendTestEmailFailure,
        ),
        map(({ error }) => {
          const detail =
            (error?.error as { message?: string })?.message ??
            error?.message ??
            'Error inesperado';
          this.notifications.error('Operación fallida', detail);
        }),
      ),
    { dispatch: false },
  );
}
