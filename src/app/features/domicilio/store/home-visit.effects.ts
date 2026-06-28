import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { HomeVisitService } from '../services/home-visit.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
} from './home-visit.actions';

function mapDomicilioError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'La visita solicitada no existe.';
  if (e.status === 409) return 'Ya existe una visita programada para ese turno.';
  if (e.status === 422) return 'Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

@Injectable()
export class HomeVisitEffects {
  private readonly actions$ = inject(Actions);
  private readonly homeVisitService = inject(HomeVisitService);
  private readonly notif = inject(NotificationService);

  // ── Listar visitas ──────────────────────────────────────────────────────────
  loadHomeVisits$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadHomeVisits),
      switchMap(({ branchId }) =>
        this.homeVisitService.list(branchId).pipe(
          map(visits => loadHomeVisitsSuccess({ visits })),
          catchError((e: HttpErrorResponse) => {
            const error = mapDomicilioError(e);
            return of(loadHomeVisitsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Crear visita ────────────────────────────────────────────────────────────
  createHomeVisit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createHomeVisit),
      concatMap(({ payload }) =>
        this.homeVisitService.create(payload).pipe(
          map(({ id }) => {
            this.notif.success('Visita domiciliaria programada correctamente.');
            return createHomeVisitSuccess({ id });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapDomicilioError(e);
            this.notif.error(error);
            return of(createHomeVisitFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
