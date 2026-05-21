import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AtencionApiService } from '../../services/atencion-api.service';
import {
  addAnalysisList,
  addObservations,
  addPayment,
  assignGeneralData,
  atencionMutationFailure,
  atencionMutationSuccess,
  cancelAtencion,
  createBlankAtencion,
  createPreFilledAtencion,
  endBilling,
  endCollection,
  endSecretaryPhase,
  loadAtencion,
  loadAtencionFailure,
  loadAtencionSuccess,
  loadAtenciones,
  loadAtencionesFailure,
  loadAtencionesSuccess,
  returnPhase,
} from './atencion.actions';

@Injectable()
export class AtencionEffects {
  private readonly actions$ = inject(Actions);
  private readonly api      = inject(AtencionApiService);
  private readonly router   = inject(Router);

  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAtenciones),
      switchMap(() =>
        this.api.list().pipe(
          map(items => loadAtencionesSuccess({ items })),
          catchError((error: HttpErrorResponse) => of(loadAtencionesFailure({ error })))
        )
      )
    )
  );

  loadDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAtencion),
      switchMap(({ id }) =>
        this.api.getById(id).pipe(
          map(item => loadAtencionSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(loadAtencionFailure({ error })))
        )
      )
    )
  );

  createBlank$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createBlankAtencion),
      switchMap(({ payload }) =>
        this.api.createBlank(payload).pipe(
          tap(item => this.router.navigate(['/analitica/atencion', item.id])),
          map(item => atencionMutationSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
        )
      )
    )
  );

  createPrefilled$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createPreFilledAtencion),
      switchMap(({ payload }) =>
        this.api.createPreFilled(payload).pipe(
          tap(item => this.router.navigate(['/analitica/atencion', item.id])),
          map(item => atencionMutationSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
        )
      )
    )
  );

  assignGeneralData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(assignGeneralData),
      switchMap(({ id, payload }) => this.api.assignGeneralData(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addAnalysisList),
      switchMap(({ id, payload }) => this.api.addAnalysis(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addPayment),
      switchMap(({ id, payload }) => this.api.addPayment(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endCollection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endCollection),
      switchMap(({ id }) => this.api.endCollection(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endBilling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endBilling),
      switchMap(({ id }) => this.api.endBilling(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endSecretaryPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endSecretaryPhase),
      switchMap(({ id }) => this.api.endSecretaryPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  returnPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(returnPhase),
      switchMap(({ id }) => this.api.returnPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  cancel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelAtencion),
      switchMap(({ id, payload }) => this.api.cancel(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addObservations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addObservations),
      switchMap(({ id, payload }) => this.api.addObservations(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );
}
