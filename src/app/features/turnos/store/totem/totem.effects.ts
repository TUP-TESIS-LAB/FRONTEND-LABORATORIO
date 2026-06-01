import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
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
          // Walk-in puro: si el paciente no existe (404), encolamos igual sin patientId.
          // Otros errores (network, 500) se propagan al catchError de abajo.
          catchError(error => error?.status === 404 ? of(null) : throwError(() => error)),
          switchMap(patient =>
            this.totemService.registerQueueEntry({
              nationalId: dni,
              patientId: patient?.id ?? null,
              branchId,
            }).pipe(
              map(reg =>
                A.submitTotemEntrySuccess({
                  queueNumber: reg.queueNumber,
                  patientFirstName: patient?.firstName ?? null,
                  patientLastName: patient?.lastName ?? null,
                }),
              ),
            ),
          ),
          catchError(() => of(A.submitTotemEntryFailure({ reason: 'UNKNOWN' }))),
        ),
      ),
    ),
  );
}
