import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { TurnosService } from '../services/turnos.service';
import { loadTurnos, loadTurnosFailure, loadTurnosSuccess } from './turnos.actions';

@Injectable()
export class TurnosEffects {
  private readonly actions$ = inject(Actions);
  private readonly turnosService = inject(TurnosService);

  loadTurnos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTurnos),
      switchMap(({ fecha }) =>
        this.turnosService.getTurnos(fecha).pipe(
          map(turnos => loadTurnosSuccess({ turnos })),
          catchError((error: HttpErrorResponse) =>
            of(loadTurnosFailure({ error }))
          )
        )
      )
    )
  );
}
