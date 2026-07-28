import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { ManualApiService } from '../services/manual-api.service';
import { loadManual, loadManualFailure, loadManualSuccess } from './manual.actions';

/**
 * Política de operadores:
 * - loadManual: switchMap (GET idempotente; si se pide de nuevo, gana el último).
 */
@Injectable()
export class ManualEffects {
  private readonly actions$     = inject(Actions);
  private readonly api          = inject(ManualApiService);
  private readonly notification = inject(NotificationService);

  loadManual$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadManual),
      switchMap(() =>
        this.api.getManual().pipe(
          map((manual) => loadManualSuccess({ manual })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error(
              'No se pudo cargar el manual de uso. Revisá la conexión e intentá de nuevo.',
            );
            return of(loadManualFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
