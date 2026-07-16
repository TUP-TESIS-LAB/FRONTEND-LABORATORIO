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
      switchMap(({ dni, slug, branchId }) =>
        this.totemService.checkIn(slug, branchId, dni).pipe(
          map(res =>
            A.submitTotemEntrySuccess({ queueNumber: res.queueNumber, hasAppointment: res.hasAppointment }),
          ),
          catchError(() => of(A.submitTotemEntryFailure({ reason: 'UNKNOWN' }))),
        ),
      ),
    ),
  );
}
