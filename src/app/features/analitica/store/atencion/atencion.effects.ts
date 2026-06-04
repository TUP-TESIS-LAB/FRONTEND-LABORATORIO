import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, of, switchMap, tap } from 'rxjs';
import { PatientService } from '../../../pacientes/services/patient.service';
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
  createPatientInline,
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
  patientNotFound,
  patientResolutionFailure,
  patientResolved,
  resolvePatientByDni,
  returnPhase,
  startAttentionForPatient,
  updatePatientInline,
} from './atencion.actions';

/**
 * Política de operadores RxJS:
 * - GET (load list, load detail): `switchMap` — la última pedida cancela las previas
 *   (el usuario quiere el resultado más reciente).
 * - Mutaciones (PATCH/POST): `concatMap` — encolamos para preservar el orden y evitar
 *   que un doble-click cancele una mutación en vuelo. Esto es crítico para los chains
 *   del wizard (addPayment → endCollection, addAnalysisList → endSecretaryPhase).
 *   `exhaustMap` también previene doble-click pero ignora los click extra; `concatMap`
 *   los procesa secuencialmente, que es lo que necesita el wizard.
 * Aborda FE-9 del review.
 */
@Injectable()
export class AtencionEffects {
  private readonly actions$  = inject(Actions);
  private readonly api       = inject(AtencionApiService);
  private readonly patients  = inject(PatientService);
  private readonly router    = inject(Router);

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
      exhaustMap(({ payload }) =>
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
      exhaustMap(({ payload }) =>
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
      concatMap(({ id, payload }) => this.api.assignGeneralData(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addAnalysisList),
      concatMap(({ id, payload }) => this.api.addAnalysis(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addPayment),
      concatMap(({ id, payload }) => this.api.addPayment(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endCollection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endCollection),
      concatMap(({ id }) => this.api.endCollection(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endBilling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endBilling),
      concatMap(({ id }) => this.api.endBilling(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endSecretaryPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endSecretaryPhase),
      concatMap(({ id }) => this.api.endSecretaryPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  returnPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(returnPhase),
      exhaustMap(({ id }) => this.api.returnPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  cancel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelAtencion),
      exhaustMap(({ id, payload }) => this.api.cancel(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addObservations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addObservations),
      concatMap(({ id, payload }) => this.api.addObservations(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  resolvePatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolvePatientByDni),
      switchMap(({ dni }) =>
        this.patients.existsByDni(dni).pipe(
          switchMap(exists =>
            exists
              ? this.patients.getByDni(dni).pipe(map(patient => patientResolved({ patient })))
              : of(patientNotFound({ dni }))),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  createPatientInline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createPatientInline),
      concatMap(({ payload }) =>
        this.patients.create(payload).pipe(
          map(patient => patientResolved({ patient })),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  updatePatientInline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updatePatientInline),
      concatMap(({ id, payload }) =>
        this.patients.update(id, payload).pipe(
          map(patient => patientResolved({ patient })),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  startAttentionForPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startAttentionForPatient),
      exhaustMap(({ patientId, indications }) =>
        this.api.createBlank({ branchId: 1, patientId, attentionNumber: `A-${Date.now().toString().slice(-6)}`, deskAttentionBox: null }).pipe(
          concatMap(created =>
            this.api.assignGeneralData(created.id, { patientId, doctorId: null, insurancePlanId: null, indications }).pipe(
              tap(item => this.router.navigate(['/analitica/atencion', item.id])),
              map(item => atencionMutationSuccess({ item })))),
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error }))),
        ))));
}
