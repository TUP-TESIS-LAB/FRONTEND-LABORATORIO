import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { PatientService } from '@features/pacientes/services/patient.service';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';
import { SacarTurnoApiService } from '../services/sacar-turno-api.service';
import * as A from './sacar-turno.actions';

@Injectable()
export class SacarTurnoEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(SacarTurnoApiService);
  private readonly patients = inject(PatientService);
  private readonly sucursales = inject(SucursalesService);
  private readonly messages = inject(MessageService);

  loadTipos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadTipos),
      mergeMap(() =>
        this.api.getTipos().pipe(
          map((tipos) => A.loadTiposSuccess({ tipos })),
          catchError((error) => of(A.loadTiposFailure({ error }))),
        ),
      ),
    ),
  );

  loadBranches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadBranches),
      mergeMap(() =>
        this.sucursales.listBranchesForSelector().pipe(
          map((branches) => A.loadBranchesSuccess({ branches })),
          catchError((error) => of(A.loadBranchesFailure({ error }))),
        ),
      ),
    ),
  );

  // switchMap: una nueva fecha/sucursal cancela el request de slots anterior.
  loadSlots$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadSlots),
      switchMap(({ branchId, date }) =>
        this.api.getAvailability(branchId, date).pipe(
          map((slots) => A.loadSlotsSuccess({ slots })),
          catchError((error) => of(A.loadSlotsFailure({ error }))),
        ),
      ),
    ),
  );

  createPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createPatient),
      mergeMap(({ request }) =>
        this.patients.create(request).pipe(
          map((patient) => A.createPatientSuccess({ patient })),
          catchError((error) => of(A.createPatientFailure({ error }))),
        ),
      ),
    ),
  );

  createPatientSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.createPatientSuccess),
        map(({ patient }) =>
          this.messages.add({
            severity: 'success',
            summary: 'Paciente dado de alta',
            detail: `${patient.lastName}, ${patient.firstName} ya quedó registrado.`,
          }),
        ),
      ),
    { dispatch: false },
  );

  createPatientFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.createPatientFailure),
        map(() =>
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo dar de alta el paciente',
            detail: 'Revisá los datos (el DNI puede estar ya registrado) e intentá de nuevo.',
          }),
        ),
      ),
    { dispatch: false },
  );

  book$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.book),
      mergeMap(({ request }) =>
        this.api.book(request).pipe(
          map(({ id }) => A.bookSuccess({ id })),
          catchError((error) => of(A.bookFailure({ error }))),
        ),
      ),
    ),
  );

  bookFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.bookFailure),
        map(() =>
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo reservar el turno',
            detail: 'Verificá la fecha y el horario e intentá nuevamente.',
          }),
        ),
      ),
    { dispatch: false },
  );

  bookSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.bookSuccess),
        map(() =>
          this.messages.add({
            severity: 'success',
            summary: 'Turno reservado',
            detail: 'El turno quedó confirmado y ya aparece en la agenda.',
          }),
        ),
      ),
    { dispatch: false },
  );
}
