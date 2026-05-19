import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';
import { TenantConfig } from '@core/models/tenant.model';
import {
  loadTenantConfig,
  loadTenantConfigSuccess,
  loadTenantConfigFailure,
} from './tenant.actions';

@Injectable()
export class TenantEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  loadConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTenantConfig),
      switchMap(() =>
        this.http.get<TenantConfig>('/api/v1/empresa/tenant-config').pipe(
          map(config => loadTenantConfigSuccess({ config })),
          catchError((error: HttpErrorResponse) => {
            if (this.router.url.startsWith('/saas')) return EMPTY;
            return of(loadTenantConfigFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
