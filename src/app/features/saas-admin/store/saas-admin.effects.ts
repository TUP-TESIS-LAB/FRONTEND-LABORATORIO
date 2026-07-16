// src/app/features/saas-admin/store/saas-admin.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '@core/services/notification.service';
import { SaasAdminApiService } from '../services/saas-admin-api.service';
import * as A from './saas-admin.actions';

function toErr(e: unknown): HttpErrorResponse {
  return e instanceof HttpErrorResponse ? e : new HttpErrorResponse({ error: e });
}

@Injectable()
export class SaasAdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(SaasAdminApiService);
  private readonly notification = inject(NotificationService);

  loadTenants$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenants),
    switchMap(() => from(this.api.listTenants()).pipe(
      map((tenants) => A.loadTenantsSuccess({ tenants })),
      catchError((e) => of(A.loadTenantsFailure({ error: toErr(e) }))),
    )),
  ));

  loadTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenant),
    switchMap(({ id }) => from(this.api.getTenant(id)).pipe(
      map((tenant) => A.loadTenantSuccess({ tenant })),
      catchError((e) => of(A.loadTenantFailure({ error: toErr(e) }))),
    )),
  ));

  createTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.createTenant),
    exhaustMap(({ req }) => from(this.api.createTenant(req)).pipe(
      map((tenant) => A.createTenantSuccess({ tenant })),
      catchError((e) => of(A.createTenantFailure({ error: toErr(e) }))),
    )),
  ));

  renameTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.renameTenant),
    concatMap(({ id, req }) => from(this.api.renameTenant(id, req)).pipe(
      map((tenant) => A.renameTenantSuccess({ tenant })),
      catchError((e) => of(A.renameTenantFailure({ error: toErr(e) }))),
    )),
  ));

  activateTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.activateTenant),
    concatMap(({ id }) => from(this.api.activateTenant(id)).pipe(
      map((tenant) => A.activateTenantSuccess({ tenant })),
      catchError((e) => of(A.activateTenantFailure({ error: toErr(e) }))),
    )),
  ));

  deactivateTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.deactivateTenant),
    concatMap(({ id }) => from(this.api.deactivateTenant(id)).pipe(
      map((tenant) => A.deactivateTenantSuccess({ tenant })),
      catchError((e) => of(A.deactivateTenantFailure({ error: toErr(e) }))),
    )),
  ));

  softDeleteTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.softDeleteTenant),
    concatMap(({ id }) => from(this.api.softDeleteTenant(id)).pipe(
      map(() => A.softDeleteTenantSuccess({ id })),
      catchError((e) => of(A.softDeleteTenantFailure({ error: toErr(e) }))),
    )),
  ));

  loadTenantModules$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenantModules),
    switchMap(({ tenantId }) => from(this.api.listTenantModules(tenantId)).pipe(
      map((modules) => A.loadTenantModulesSuccess({ tenantId, modules })),
      catchError((e) => of(A.loadTenantModulesFailure({ error: toErr(e) }))),
    )),
  ));

  toggleTenantModule$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleTenantModule),
    concatMap(({ tenantId, code, enable }) => from(this.api.toggleTenantModule(tenantId, code, enable)).pipe(
      map(() => A.toggleTenantModuleSuccess({ tenantId, code, enabled: enable })),
      catchError((e) => {
        this.notification.error('No se pudo actualizar el módulo.', 'Reintentá en un momento.');
        return of(A.toggleTenantModuleFailure({ error: toErr(e) }));
      }),
    )),
  ));

  loadTenantWhiteLabel$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenantWhiteLabel),
    switchMap(({ tenantId }) => from(this.api.getTenantWhiteLabel(tenantId)).pipe(
      map((whiteLabel) => A.loadTenantWhiteLabelSuccess({ whiteLabel })),
      catchError((e) => of(A.loadTenantWhiteLabelFailure({ error: toErr(e) }))),
    )),
  ));

  upsertTenantWhiteLabel$ = createEffect(() => this.actions$.pipe(
    ofType(A.upsertTenantWhiteLabel),
    concatMap(({ tenantId, req }) => from(this.api.upsertTenantWhiteLabel(tenantId, req)).pipe(
      map((whiteLabel) => A.upsertTenantWhiteLabelSuccess({ whiteLabel })),
      catchError((e) => of(A.upsertTenantWhiteLabelFailure({ error: toErr(e) }))),
    )),
  ));
}
