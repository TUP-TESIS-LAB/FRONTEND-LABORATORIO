import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, exhaustMap, map, of, switchMap } from 'rxjs';
import { DoctorService } from '../services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctor, loadDoctorSuccess, loadDoctorFailure,
  addDoctor, addDoctorSuccess, addDoctorFailure,
  updateDoctor, updateDoctorSuccess, updateDoctorFailure,
  toggleDoctorStatus, toggleDoctorStatusSuccess, toggleDoctorStatusFailure,
  deleteDoctor, deleteDoctorSuccess, deleteDoctorFailure,
} from './doctor.actions';

@Injectable()
export class DoctorEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(DoctorService);
  private readonly notifications = inject(NotificationService);

  loadDoctors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDoctors),
      switchMap(() =>
        this.service.list().pipe(
          map((doctors) => loadDoctorsSuccess({ doctors })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar los medicos.');
            return of(loadDoctorsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDoctor),
      switchMap(({ id }) =>
        this.service.getById(id).pipe(
          map((doctor) => loadDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cargar el medico.');
            return of(loadDoctorFailure({ error }));
          }),
        ),
      ),
    ),
  );

  addDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addDoctor),
      exhaustMap(({ req }) =>
        this.service.create(req).pipe(
          map((doctor) => addDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => of(addDoctorFailure({ error }))),
        ),
      ),
    ),
  );

  updateDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateDoctor),
      exhaustMap(({ id, req }) =>
        this.service.update(id, req).pipe(
          map((doctor) => updateDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => of(updateDoctorFailure({ error }))),
        ),
      ),
    ),
  );

  toggleDoctorStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleDoctorStatus),
      concatMap(({ id }) =>
        this.service.toggleStatus(id).pipe(
          map((doctor) => toggleDoctorStatusSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cambiar el estado del medico.');
            return of(toggleDoctorStatusFailure({ error }));
          }),
        ),
      ),
    ),
  );

  deleteDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteDoctor),
      concatMap(({ id }) =>
        this.service.remove(id).pipe(
          map(() => deleteDoctorSuccess({ id })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo eliminar el medico.');
            return of(deleteDoctorFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
