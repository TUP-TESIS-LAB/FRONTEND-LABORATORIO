import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FinancieroService } from '../services/financiero.service';
import {
  loadPagos, loadPagosSuccess, loadPagosFailure,
  loadCoberturas, loadCoberturasSuccess, loadCoberturasFailure,
  loadMovimientos, loadMovimientosSuccess, loadMovimientosFailure,
} from './financiero.actions';

@Injectable()
export class FinancieroEffects {
  private readonly actions$ = inject(Actions);
  private readonly financieroService = inject(FinancieroService);

  loadPagos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPagos),
      switchMap(() =>
        this.financieroService.getPagos().pipe(
          map((pagos) => loadPagosSuccess({ pagos })),
          catchError((error: HttpErrorResponse) => of(loadPagosFailure({ error })))
        )
      )
    )
  );

  loadCoberturas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCoberturas),
      switchMap(() =>
        this.financieroService.getCoberturas().pipe(
          map((coberturas) => loadCoberturasSuccess({ coberturas })),
          catchError((error: HttpErrorResponse) => of(loadCoberturasFailure({ error })))
        )
      )
    )
  );

  loadMovimientos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMovimientos),
      switchMap(() =>
        this.financieroService.getMovimientos().pipe(
          map((movimientos) => loadMovimientosSuccess({ movimientos })),
          catchError((error: HttpErrorResponse) => of(loadMovimientosFailure({ error })))
        )
      )
    )
  );
}
