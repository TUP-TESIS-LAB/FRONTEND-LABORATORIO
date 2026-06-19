import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { NomencladorService } from '../../services/nomenclador.service';
import {
  cargarCatalog, cargarCatalogFailure, cargarCatalogSuccess,
  cargarPricing, cargarPricingFailure, cargarPricingSuccess,
  cargarVersiones, cargarVersionesFailure, cargarVersionesSuccess,
  guardarValorUb, guardarValorUbFailure, guardarValorUbSuccess,
  setOverride, setOverrideFailure, setOverrideSuccess,
} from './nomenclador.actions';

@Injectable()
export class NomencladorEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(NomencladorService);

  cargarVersiones$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarVersiones),
      switchMap(() =>
        this.svc.getVersions().pipe(
          map(versiones => cargarVersionesSuccess({ versiones })),
          catchError(error => of(cargarVersionesFailure({ error }))),
        ),
      ),
    ),
  );

  cargarCatalog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarCatalog),
      switchMap(() =>
        this.svc.getCatalog().pipe(
          map(catalog => cargarCatalogSuccess({ catalog })),
          catchError(error => of(cargarCatalogFailure({ error }))),
        ),
      ),
    ),
  );

  cargarPricing$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarPricing),
      switchMap(() =>
        this.svc.getParticularPricing().pipe(
          map(pricing => cargarPricingSuccess({ pricing })),
          catchError(error => of(cargarPricingFailure({ error }))),
        ),
      ),
    ),
  );

  guardarValorUb$ = createEffect(() =>
    this.actions$.pipe(
      ofType(guardarValorUb),
      switchMap(({ valor }) =>
        this.svc.saveValorUb(valor).pipe(
          map(v => guardarValorUbSuccess({ valor: v })),
          catchError(error => of(guardarValorUbFailure({ error }))),
        ),
      ),
    ),
  );

  setOverride$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setOverride),
      switchMap(({ analysisId, precio }) =>
        this.svc.setOverride(analysisId, precio).pipe(
          map(r => setOverrideSuccess({ analysisId: r.analysisId, precio: r.precio })),
          catchError(error => of(setOverrideFailure({ error }))),
        ),
      ),
    ),
  );
}
