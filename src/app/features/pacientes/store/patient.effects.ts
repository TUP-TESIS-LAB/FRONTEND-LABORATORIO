import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError, concatMap, debounceTime, distinctUntilChanged, exhaustMap, filter,
  map, of, switchMap, withLatestFrom,
} from 'rxjs';
import { PatientService } from '../services/patient.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, loadPatientFailure,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess, updatePatientFailure,
  checkPatientDni, checkPatientDniSuccess, checkPatientDniFailure,
  togglePatientActive, togglePatientActiveSuccess, togglePatientActiveFailure,
} from './patient.actions';
import { selectPatientPageRequest } from './patient.selectors';

@Injectable()
export class PatientEffects {
  private readonly actions$ = inject(Actions);
  private readonly patientService = inject(PatientService);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);

  loadPatients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPatients),
      switchMap(({ req }) =>
        this.patientService.search(req).pipe(
          map((result) => loadPatientsSuccess({ result })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar los pacientes');
            return of(loadPatientsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  /** When filters/page change, refetch with the merged page request from the store. */
  setPatientPageRequestPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setPatientPageRequest),
      withLatestFrom(this.store.select(selectPatientPageRequest)),
      map(([, req]) => loadPatients({ req })),
    ),
  );

  loadPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPatient),
      switchMap(({ id }) =>
        this.patientService.getById(id).pipe(
          map((patient) => loadPatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cargar el paciente');
            return of(loadPatientFailure({ error }));
          }),
        ),
      ),
    ),
  );

  addPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addPatient),
      exhaustMap(({ req }) =>
        this.patientService.create(req).pipe(
          map((patient) => addPatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(addPatientFailure({ error }))),
        ),
      ),
    ),
  );

  updatePatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updatePatient),
      exhaustMap(({ id, req }) =>
        this.patientService.update(id, req).pipe(
          map((patient) => updatePatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(updatePatientFailure({ error }))),
        ),
      ),
    ),
  );

  togglePatientActive$ = createEffect(() =>
    this.actions$.pipe(
      ofType(togglePatientActive),
      concatMap(({ id, deleted }) =>
        this.patientService.toggleActive(id, deleted).pipe(
          map(() => togglePatientActiveSuccess({ id, deleted })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo actualizar el paciente');
            return of(togglePatientActiveFailure({ error }));
          }),
        ),
      ),
    ),
  );

  checkPatientDni$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkPatientDni),
      debounceTime(400),
      distinctUntilChanged((a, b) => a.dni === b.dni),
      filter(({ dni }) => /^\d{7,}$/.test(dni)),
      switchMap(({ dni }) =>
        this.patientService.existsByDni(dni).pipe(
          map((exists) => checkPatientDniSuccess({ dni, exists })),
          catchError((error: HttpErrorResponse) => of(checkPatientDniFailure({ error }))),
        ),
      ),
    ),
  );
}
