import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { TotemService } from '../../pages/totem/services/totem.service';
import * as A from './totem.actions';

@Injectable()
export class TotemEffects {
  private actions$ = inject(Actions);
  private totemService = inject(TotemService);

  submitTotemEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.submitTotemEntry),
      switchMap(({ dni, branchId }) =>
        this.totemService.lookupPatientByDni(dni).pipe(
          switchMap((patient) =>
            this.totemService.registerQueueEntry({ patientId: patient.id, branchId }).pipe(
              map((reg) =>
                A.submitTotemEntrySuccess({
                  queueNumber: reg.queueNumber,
                  patientFirstName: patient.firstName,
                  patientLastName: patient.lastName,
                }),
              ),
            ),
          ),
          catchError((error) => {
            const reason: 'PATIENT_NOT_FOUND' | 'UNKNOWN' =
              error?.status === 404 ? 'PATIENT_NOT_FOUND' : 'UNKNOWN';
            return of(A.submitTotemEntryFailure({ reason }));
          }),
        ),
      ),
    ),
  );
}
