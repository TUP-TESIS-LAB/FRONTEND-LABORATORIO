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
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';
import * as A from './extraction.actions';
import {
  selectBoxAssignments,
  selectSelectedBranchId,
} from './extraction.selectors';

@Injectable()
export class ExtractionEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ExtractorAttentionService);
  private readonly notifier = inject(NotificationService);
  private readonly store = inject(Store);
  private readonly boxService = inject(ExtractorBoxService);

  /** Evita apilar toasts de "boxes guardada" cuando se disparan saves rápidos en sucesión. */
  private boxSaveToastTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * refreshAll dispara los loads cuando hay sucursal seleccionada.
   * v3: incluye loadBoxAssignments + loadInProgress + loadAwaiting (+ stats, occupancy).
   */
  refreshAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.refreshAll),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      mergeMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        // NOTA: boxAssignments NO se pollea (es config, no data dinámica). Se carga
        // en branchChange y se actualiza con la respuesta del PUT. Pollearlo pisaba
        // la asignación optimista del operador mientras un save estaba en vuelo.
        return of(
          A.loadAwaiting(),
          A.loadInProgress(),
          A.loadStats(),
          A.loadOccupancy(),
        );
      }),
    ),
  );

  /**
   * Al cambiar la sucursal seleccionada, refrescamos todo + cargamos extractors
   * y box assignments de la nueva sucursal.
   */
  branchChangeRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.setSelectedBranch),
      filter(({ branchId }) => branchId != null),
      mergeMap(() => of(A.refreshAll(), A.loadBranchExtractors(), A.loadBoxAssignments())),
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

  loadInProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadInProgress),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getMine(branchId).pipe(
          map((r) => mapLoad<InExtractionItem[]>(
            r,
            (items) => A.loadInProgressSuccess({ items }),
            () => A.loadInProgressNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadInProgressFailure({ error }))),
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

  loadBoxAssignments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadBoxAssignments),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getBoxAssignments(branchId).pipe(
          map((r) => mapLoad<BoxAssignment[]>(
            r,
            (items) => A.loadBoxAssignmentsSuccess({ items }),
            () => A.loadBoxAssignmentsNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadBoxAssignmentsFailure({ error }))),
        );
      }),
    ),
  );

  loadBranchExtractors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadBranchExtractors),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getBranchExtractors(branchId).pipe(
          map((r) => mapLoad<BranchExtractor[]>(
            r,
            (items) => A.loadBranchExtractorsSuccess({ items }),
            () => A.loadBranchExtractorsNotModified(),
          )),
          catchError((error: HttpErrorResponse) => of(A.loadBranchExtractorsFailure({ error }))),
        );
      }),
    ),
  );

  // --- Mutations -----------------------------------------------------------
  assignExtractor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.assignExtractor),
      withLatestFrom(this.store.select(selectBoxAssignments)),
      exhaustMap(([{ id, boxNumber, branchId }, boxAssignments]) => {
        // El extractor que atiende es el configurado en ESE box, no el operador
        // que dispara la asignación. Resolvemos el nombre desde boxAssignments.
        const extractorFullName =
          boxAssignments.find((b) => b.boxNumber === boxNumber)?.extractorFullName ?? '';
        return this.api.assignExtractor(id, boxNumber, branchId).pipe(
          map(() => A.assignExtractorSuccess({
            attentionId: id,
            boxNumber,
            extractorFullName,
          })),
          catchError((error: HttpErrorResponse) => of(A.assignExtractorFailure({ error }))),
        );
      }),
    ),
  );

  unassignExtraction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.unassignExtraction),
      exhaustMap(({ id }) => this.api.unassignExtraction(id).pipe(
        map(() => A.unassignExtractionSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.unassignExtractionFailure({ error }))),
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

  cancelAttention$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.cancelAttention),
      exhaustMap(({ id, reason }) => this.api.cancelAttention(id, reason).pipe(
        map(() => A.cancelAttentionSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.cancelAttentionFailure({ error }))),
      )),
    ),
  );

  endExtraction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.endExtraction),
      exhaustMap(({ id, observation }) => this.api.endExtraction(id, observation).pipe(
        map(() => A.endExtractionSuccess({ id })),
        catchError((error: HttpErrorResponse) => of(A.endExtractionFailure({ error }))),
      )),
    ),
  );

  saveBoxAssignments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.saveBoxAssignments),
      withLatestFrom(this.store.select(selectSelectedBranchId)),
      concatMap(([{ boxes }, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.saveBoxAssignments(branchId, boxes).pipe(
          map((items) => A.saveBoxAssignmentsSuccess({ items })),
          catchError((error: HttpErrorResponse) => of(A.saveBoxAssignmentsFailure({ error }))),
        );
      }),
    ),
  );

  /** Toda mutation exitosa refresca toda la pantalla. */
  mutationRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        A.assignExtractorSuccess,
        A.unassignExtractionSuccess,
        A.cancelExtractionSuccess,
        A.cancelAttentionSuccess,
        A.endExtractionSuccess,
        A.saveBoxAssignmentsSuccess,
      ),
      map(() => A.refreshAll()),
    ),
  );

  // --- Manejo especial de 403 al cambiar de sucursal ---------------------
  branchAccessDenied$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        A.loadAwaitingFailure,
        A.loadInProgressFailure,
        A.loadStatsFailure,
        A.loadOccupancyFailure,
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
        A.unassignExtractionSuccess, A.unassignExtractionFailure,
        A.cancelExtractionSuccess, A.cancelExtractionFailure,
        A.cancelAttentionSuccess, A.cancelAttentionFailure,
        A.endExtractionSuccess, A.endExtractionFailure,
        A.saveBoxAssignmentsSuccess, A.saveBoxAssignmentsFailure,
      ),
      tap((action: Action) => this.toastForMutation(action)),
    ),
  { dispatch: false });

  /**
   * Si el assign falla con 409 (box ocupado por otro extractor / race), forzamos
   * un refresh inmediato para que la UI muestre quién tomó el box sin esperar
   * el próximo tick de polling.
   */
  refreshOnAssignConflict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.assignExtractorFailure),
      filter(({ error }) => error?.status === 409),
      map(() => A.refreshAll()),
    ),
  );

  private toastForMutation(action: Action): void {
    switch (action.type) {
      case A.assignExtractorSuccess.type:
        // El toast de undo con timer de 5s lo arma la page (Task 7) observando lastAssigned.
        return;
      case A.unassignExtractionSuccess.type:
        this.notifier.success('Extracción desasignada.');
        return;
      case A.cancelExtractionSuccess.type:
        this.notifier.success('Extracción cancelada.');
        return;
      case A.cancelAttentionSuccess.type:
        this.notifier.success('Atención cancelada.');
        return;
      case A.endExtractionSuccess.type:
        this.notifier.success('Extracción finalizada.');
        return;
      case A.saveBoxAssignmentsSuccess.type:
        // Debounce: si hay un timer pendiente del anterior save, lo cancelamos y
        // programamos uno nuevo para que solo se muestre el toast del último save.
        if (this.boxSaveToastTimer != null) {
          clearTimeout(this.boxSaveToastTimer);
        }
        this.boxSaveToastTimer = setTimeout(() => {
          this.boxSaveToastTimer = null;
          this.notifier.success('Asignación de boxes guardada.');
        }, 300);
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
      case A.unassignExtractionFailure.type: {
        const err = (action as ReturnType<typeof A.unassignExtractionFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos desasignar la extracción.',
        }));
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
      case A.cancelAttentionFailure.type: {
        const err = (action as ReturnType<typeof A.cancelAttentionFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos cancelar la atención.',
          byStatus: {
            400: 'El motivo de cancelación no es válido.',
            404: 'No encontramos la atención solicitada.',
            409: 'La atención no se puede cancelar en su estado actual.',
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
      case A.saveBoxAssignmentsFailure.type: {
        const err = (action as ReturnType<typeof A.saveBoxAssignmentsFailure>).error;
        this.notifier.error(humanizeBackendError(err, {
          fallback: 'No pudimos guardar la asignación de boxes.',
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
