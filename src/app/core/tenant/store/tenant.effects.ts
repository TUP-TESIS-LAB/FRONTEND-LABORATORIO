import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, switchMap } from 'rxjs';
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

  loadConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTenantConfig),
      switchMap(() =>
        this.http.get<TenantConfig>('/api/tenant/config').pipe(
          map(config => loadTenantConfigSuccess({ config })),
          catchError((error: HttpErrorResponse) =>
            of(loadTenantConfigFailure({ error })),
          ),
        ),
      ),
    ),
  );
}
