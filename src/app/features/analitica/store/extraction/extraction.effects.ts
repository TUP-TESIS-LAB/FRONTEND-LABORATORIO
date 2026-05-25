import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { NotModified, isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ExtractorAttentionService } from '../../services/extractor-attention.service';
import {
  AwaitingExtractionItem,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';
import * as A from './extraction.actions';

@Injectable()
export class ExtractionEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ExtractorAttentionService);
  private readonly notifier = inject(NotificationService);

  // refreshAll dispara los 3 loads en paralelo.
  refreshAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.refreshAll),
      mergeMap(() => [A.loadAwaiting(), A.loadMine(), A.loadStats()]),
    ),
  );

  loadAwaiting$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadAwaiting),
      switchMap(() => this.api.getAwaiting().pipe(
        map((r) => mapLoad<AwaitingExtractionItem[]>(
          r,
          (items) => A.loadAwaitingSuccess({ items }),
          () => A.loadAwaitingNotModified(),
        )),
        catchError((error: HttpErrorResponse) => of(A.loadAwaitingFailure({ error }))),
      )),
    ),
  );

  loadMine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadMine),
      switchMap(() => this.api.getMine().pipe(
        map((r) => mapLoad<InExtractionItem[]>(
          r,
          (items) => A.loadMineSuccess({ items }),
          () => A.loadMineNotModified(),
        )),
        catchError((error: HttpErrorResponse) => of(A.loadMineFailure({ error }))),
      )),
    ),
  );

  loadStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadStats),
      switchMap(() => this.api.getStats().pipe(
        map((r) => mapLoad<ExtractionStats>(
          r,
          (stats) => A.loadStatsSuccess({ stats }),
          () => A.loadStatsNotModified(),
        )),
        catchError((error: HttpErrorResponse) => of(A.loadStatsFailure({ error }))),
      )),
    ),
  );

  // --- Mutations -----------------------------------------------------------
  assignExtractor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.assignExtractor),
      exhaustMap(({ id, box }) => this.api.assignExtractor(id, box).pipe(
        map(() => A.assignExtractorSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.assignExtractorFailure({ error }))),
      )),
    ),
  );

  cancelExtraction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.cancelExtraction),
      exhaustMap(({ id }) => this.api.cancelExtraction(id).pipe(
        map(() => A.cancelExtractionSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.cancelExtractionFailure({ error }))),
      )),
    ),
  );

  endExtraction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.endExtraction),
      exhaustMap(({ id }) => this.api.endExtraction(id).pipe(
        map(() => A.endExtractionSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.endExtractionFailure({ error }))),
      )),
    ),
  );

  // Toda mutation exitosa refresca la pantalla.
  mutationRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        A.assignExtractorSuccess,
        A.cancelExtractionSuccess,
        A.endExtractionSuccess,
      ),
      map(() => A.refreshAll()),
    ),
  );

  // Toasts (regla #4: español, sin leak). Side-effect only, dispatch: false.
  mutationToasts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        A.assignExtractorSuccess, A.assignExtractorFailure,
        A.cancelExtractionSuccess, A.cancelExtractionFailure,
        A.endExtractionSuccess, A.endExtractionFailure,
      ),
      tap((action: Action) => this.toastForMutation(action)),
    ),
  { dispatch: false });

  private toastForMutation(action: Action): void {
    switch (action.type) {
      case A.assignExtractorSuccess.type:
        this.notifier.success('Tomaste la extracción correctamente.');
        return;
      case A.cancelExtractionSuccess.type:
        this.notifier.success('Extracción cancelada.');
        return;
      case A.endExtractionSuccess.type:
        this.notifier.success('Extracción finalizada.');
        return;
      case A.assignExtractorFailure.type: {
        const err = (action as ReturnType<typeof A.assignExtractorFailure>).error;
        const msg = err.status === 409
          ? 'Otro extractor tomó este paciente. La cola se actualizó.'
          : humanizeBackendError(err, {
              fallback: 'No pudimos tomar la extracción. Probá de nuevo.',
              byStatus: {
                403: 'No tenés permiso para tomar extracciones.',
                404: 'No encontramos la atención solicitada.',
              },
            });
        this.notifier.error(msg);
        return;
      }
      case A.cancelExtractionFailure.type: {
        const err = (action as ReturnType<typeof A.cancelExtractionFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos cancelar la extracción.',
        }));
        return;
      }
      case A.endExtractionFailure.type: {
        const err = (action as ReturnType<typeof A.endExtractionFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos finalizar la extracción.',
        }));
        return;
      }
      default:
        return;
    }
  }
}

function mapLoad<T>(
  res: T | NotModified,
  onSuccess: (items: T) => Action,
  onNotModified: () => Action,
): Action {
  return isNotModified(res) ? onNotModified() : onSuccess(res);
}
