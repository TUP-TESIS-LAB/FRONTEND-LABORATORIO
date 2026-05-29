import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import * as A from './appointments.actions';

@Injectable()
export class AppointmentsEffects {
  private actions$ = inject(Actions);
  private service = inject(AppointmentService);

  loadToday$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTodayAppointments),
    switchMap(({ branchId }) => this.service.listToday(branchId).pipe(
      map(appointments => A.loadTodayAppointmentsSuccess({ appointments })),
      catchError(error => of(A.loadTodayAppointmentsFailure({ error }))),
    )),
  ));
}
