import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, concatMap, exhaustMap, map, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { humanizeBackendError } from '@shared/utils/error-messages';

import { ExternalLabService } from '../../services/external-lab.service';
import {
  enter, setState, create, update, toggle,
  loadSuccess, loadFailure, mutateSuccess, mutateFailure,
} from './derivaciones.actions';
import { selectState } from './derivaciones.selectors';

// Regla #4: nunca mostrar el mensaje crudo del backend (podría filtrar SQL/FQCN). Pasa por
// humanizeBackendError, con fallbacks distintos para lectura vs mutación.
const readError = (error: HttpErrorResponse): string =>
  humanizeBackendError(error, { fallback: 'No se pudieron cargar los laboratorios derivados.' });
const mutateError = (error: HttpErrorResponse): string =>
  humanizeBackendError(error, { fallback: 'No se pudo guardar el laboratorio externo.' });

/** Store de la tab "Derivaciones" de Empresa (KAN-219) — mutación pesimista, sin polling. */
@Injectable()
export class DerivacionesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(ExternalLabService);
  private readonly notifications = inject(NotificationService);

  // ── Lectura ─────────────────────────────────────────────────────────────
  // Enter/SetState/MutateSuccess re-cargan el listado según el segmento actual.

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(enter, setState, mutateSuccess),
      withLatestFrom(this.store.select(selectState)),
      switchMap(([, state]) =>
        this.service.list(state).pipe(
          map((labs) => loadSuccess({ labs })),
          catchError((error: HttpErrorResponse) => of(loadFailure({ error: readError(error) }))),
        ),
      ),
    ),
  );

  // ── Mutaciones ──────────────────────────────────────────────────────────

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(create),
      exhaustMap(({ req }) =>
        this.service.create(req).pipe(
          map(() => mutateSuccess()),
          catchError((error: HttpErrorResponse) => of(mutateFailure({ error: mutateError(error) }))),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(update),
      concatMap(({ id, req }) =>
        this.service.update(id, req).pipe(
          map(() => mutateSuccess()),
          catchError((error: HttpErrorResponse) => of(mutateFailure({ error: mutateError(error) }))),
        ),
      ),
    ),
  );

  toggle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggle),
      mergeMap(({ id, deleted }) =>
        this.service.toggle(id, deleted).pipe(
          map(() => mutateSuccess()),
          catchError((error: HttpErrorResponse) => of(mutateFailure({ error: mutateError(error) }))),
        ),
      ),
    ),
  );

  // ── Toasts (no dispatch) ──────────────────────────────────────────────────

  mutateSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(mutateSuccess),
        map(() => this.notifications.success('Cambios guardados')),
      ),
    { dispatch: false },
  );

  mutateFailureToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(mutateFailure),
        map(({ error }) => this.notifications.error(error)),
      ),
    { dispatch: false },
  );
}
