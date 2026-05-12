import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AnaliticaService } from '../services/analitica.service';
import {
  loadProtocolos, loadProtocolosSuccess, loadProtocolosFailure,
  loadNbus, loadNbusSuccess, loadNbusFailure,
} from './analitica.actions';

@Injectable()
export class AnaliticaEffects {
  private readonly actions$ = inject(Actions);
  private readonly analiticaService = inject(AnaliticaService);

  loadProtocolos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProtocolos),
      switchMap(() =>
        this.analiticaService.getProtocolos().pipe(
          map((protocolos) => loadProtocolosSuccess({ protocolos })),
          catchError((error) => of(loadProtocolosFailure({ error })))
        )
      )
    )
  );

  loadNbus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadNbus),
      switchMap(() =>
        this.analiticaService.getNbus().pipe(
          map((nbus) => loadNbusSuccess({ nbus })),
          catchError((error) => of(loadNbusFailure({ error })))
        )
      )
    )
  );
}
