import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SucursalesService } from '../services/sucursales.service';
import {
  loadSucursales,
  loadSucursalesSuccess,
  loadSucursalesFailure,
  loadAreas,
  loadAreasSuccess,
  loadAreasFailure,
} from './sucursales.actions';

@Injectable()
export class SucursalesEffects {
  private readonly actions$ = inject(Actions);
  private readonly sucursalesService = inject(SucursalesService);

  loadSucursales$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSucursales),
      switchMap(() =>
        this.sucursalesService.getSucursales().pipe(
          map(sucursales => loadSucursalesSuccess({ sucursales })),
          catchError(error => of(loadSucursalesFailure({ error })))
        )
      )
    )
  );

  loadAreas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAreas),
      switchMap(({ sucursalId }) =>
        this.sucursalesService.getAreas(sucursalId).pipe(
          map(areas => loadAreasSuccess({ areas })),
          catchError(error => of(loadAreasFailure({ error })))
        )
      )
    )
  );
}
