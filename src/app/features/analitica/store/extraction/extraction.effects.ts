import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  filter,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { NotModified, isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { ExtractorBoxService } from '@core/services/extractor-box.service';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ExtractorAttentionService } from '../../services/extractor-attention.service';
import {
  AwaitingExtractionItem,
  BoxOccupancyItem,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';
import * as A from './extraction.actions';
import { selectSelectedBranchId } from './extraction.selectors';

@Injectable()
export class ExtractionEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ExtractorAttentionService);
  private readonly notifier = inject(NotificationService);
  private readonly store = inject(Store);
  private readonly boxService = inject(ExtractorBoxService);

  // refreshAll dispara los 4 loads cuando hay sucursal seleccionada.
  refreshAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.refreshAll),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      mergeMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return of(
          A.loadAwaiting(),
          A.loadMine(),
          A.loadStats(),
          A.loadOccupancy(),
        );
      }),
    ),
  );

  // Al cambiar la sucursal seleccionada, refrescamos todo.
  branchChangeRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.setSelectedBranch),
      filter(({ branchId }) => branchId != null),
      map(() => A.refreshAll()),
    ),
  );

  // --- Branches ----------------------------------------------------------
  loadBranches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadBranches),
      switchMap(() => this.api.getMyBranches().pipe(
        map((r) => mapLoad<BranchOption[]>(
          r,
          (items) => A.loadBranchesSuccess({ items }),
          () => A.loadBranchesNotModified(),
        )),
        catchError((error: HttpErrorResponse) => of(A.loadBranchesFailure({ error }))),
      )),
    ),
  );

  // --- Loads dependientes de branchId ------------------------------------
  loadAwaiting$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadAwaiting),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getAwaiting(branchId).pipe(
          map((r) => mapLoad<AwaitingExtractionItem[]>(
            r,
            (items) => A.loadAwaitingSuccess({ items }),
            () => A.loadAwaitingNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadAwaitingFailure({ error }))),
        );
      }),
    ),
  );

  loadMine$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadMine),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getMine(branchId).pipe(
          map((r) => mapLoad<InExtractionItem[]>(
            r,
            (items) => A.loadMineSuccess({ items }),
            () => A.loadMineNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadMineFailure({ error }))),
        );
      }),
    ),
  );

  loadStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadStats),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getStats(branchId).pipe(
          map((r) => mapLoad<ExtractionStats>(
            r,
            (stats) => A.loadStatsSuccess({ stats }),
            () => A.loadStatsNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadStatsFailure({ error }))),
        );
      }),
    ),
  );

  loadOccupancy$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadOccupancy),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getBoxOccupancy(branchId).pipe(
          map((r) => mapLoad<BoxOccupancyItem[]>(
            r,
            (items) => A.loadOccupancySuccess({ items }),
            () => A.loadOccupancyNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadOccupancyFailure({ error }))),
        );
      }),
    ),
  );

  // --- Mutations -----------------------------------------------------------
  assignExtractor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.assignExtractor),
      exhaustMap(({ id, box, branchId }) => this.api.assignExtractor(id, box, branchId).pipe(
        map(() => A.assignExtractorSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.assignExtractorFailure({ error }))),
      )),
    ),
  );

  cancelExtraction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.cancelExtraction),
      exhaustMap(({ id, reason }) => this.api.cancelExtraction(id, reason).pipe(
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

  // Toda mutation exitosa refresca toda la pantalla (incluye occupancy).
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

  // --- Manejo especial de 403 al cambiar de sucursal ---------------------
  branchAccessDenied$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        A.loadAwaitingFailure, A.loadMineFailure, A.loadStatsFailure, A.loadOccupancyFailure,
      ),
      filter((a: { error: HttpErrorResponse }) => a.error.status === 403),
      take(1),
      concatMap(({ error }) => {
        const msg = humanizeBackendError(error, {
          fallback: 'No tenés acceso a esta sucursal.',
          byStatus: { 403: 'No tenés acceso a esta sucursal.' },
        });
        this.notifier.error(msg);
        this.boxService.setSelectedBranch(null);
        return of(A.setSelectedBranch({ branchId: null }));
      }),
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
        const msg = humanizeBackendError(err, {
          fallback: 'No pudimos tomar la extracción. Probá de nuevo.',
          byStatus: {
            403: 'No tenés permiso para tomar extracciones.',
            404: 'No encontramos la atención solicitada.',
            409: 'El box que elegiste está ocupado por otro extractor. Cambiá de box.',
          },
        });
        this.notifier.error(msg);
        return;
      }
      case A.cancelExtractionFailure.type: {
        const err = (action as ReturnType<typeof A.cancelExtractionFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos cancelar la extracción.',
          byStatus: {
            400: 'El motivo de cancelación no es válido.',
            404: 'No encontramos la atención solicitada.',
          },
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
