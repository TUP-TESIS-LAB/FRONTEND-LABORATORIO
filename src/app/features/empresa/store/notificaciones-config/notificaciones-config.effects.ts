import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of, switchMap } from 'rxjs';

import { NotificacionesConfigApiService } from '../../services/notificaciones-config-api.service';
import {
  loadConfigs,
  loadConfigsSuccess,
  loadConfigsFailure,
  updateConfig,
  updateConfigSuccess,
  updateConfigFailure,
  loadEligible,
  loadEligibleSuccess,
  loadEligibleFailure,
} from './notificaciones-config.actions';

/** Store de la tab "Notificaciones" de Empresa — mutación pesimista, sin polling. */
@Injectable()
export class NotifConfigEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(NotificacionesConfigApiService);

  loadConfigs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadConfigs),
      switchMap(() =>
        this.api.getConfigs().pipe(
          map((eventConfigs) => loadConfigsSuccess({ eventConfigs })),
          catchError((error: HttpErrorResponse) => of(loadConfigsFailure({ error }))),
        ),
      ),
    ),
  );

  updateConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateConfig),
      concatMap(({ eventType, enabled, recipients }) =>
        this.api.updateConfig(eventType, { enabled, recipients }).pipe(
          map(() => updateConfigSuccess()),
          catchError((error: HttpErrorResponse) => of(updateConfigFailure({ error }))),
        ),
      ),
    ),
  );

  /** Mutación pesimista: solo tras confirmar el éxito del PUT se refresca el catálogo. */
  reloadAfterUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateConfigSuccess),
      map(() => loadConfigs()),
    ),
  );

  loadEligible$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEligible),
      switchMap(({ eventType }) =>
        this.api.getEligible(eventType).pipe(
          map((eligible) => loadEligibleSuccess({ eventType, eligible })),
          catchError((error: HttpErrorResponse) => of(loadEligibleFailure({ error }))),
        ),
      ),
    ),
  );
}
