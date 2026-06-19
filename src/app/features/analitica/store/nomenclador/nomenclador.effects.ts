import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { NomencladorService } from '../../services/nomenclador.service';
import {
  loadDeterminations,
  loadDeterminationsSuccess,
  loadNomenclador,
  loadNomencladorFailure,
  loadNomencladorSuccess,
  saveValorUb,
  saveValorUbSuccess,
  setOverride,
  setOverrideSuccess,
} from './nomenclador.actions';

@Injectable()
export class NomencladorEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(NomencladorService);

  /**
   * Carga inicial: versiones + catálogo + pricing en paralelo.
   * Un único dispatch de `loadNomenclador` dispara todo.
   */
  loadNomenclador$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadNomenclador),
      switchMap(() =>
        forkJoin({
          versions: this.svc.getVersions(),
          catalog: this.svc.getCatalog(),
          pricing: this.svc.getParticularPricing(),
        }).pipe(
          map(({ versions, catalog, pricing }) =>
            loadNomencladorSuccess({ versions, catalog, pricing }),
          ),
          catchError(error => of(loadNomencladorFailure({ error }))),
        ),
      ),
    ),
  );

  /**
   * Carga lazy de determinaciones de un análisis (tab Catálogo).
   * Usa mergeMap para permitir cargas simultáneas de distintos analysisId.
   * En error: éxito con array vacío (no bloquea la UI).
   */
  loadDeterminations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDeterminations),
      mergeMap(({ analysisId }) =>
        this.svc.getDeterminations(analysisId).pipe(
          map(determinations => loadDeterminationsSuccess({ analysisId, determinations })),
          catchError(() => of(loadDeterminationsSuccess({ analysisId, determinations: [] }))),
        ),
      ),
    ),
  );

  /** Pessimistic: persiste el valorUb y confirma con el valor devuelto por el servicio. */
  saveValorUb$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveValorUb),
      switchMap(({ valor }) =>
        this.svc.saveValorUb(valor).pipe(
          map(v => saveValorUbSuccess({ valor: v })),
        ),
      ),
    ),
  );

  /** Pessimistic: persiste el override y confirma con los ids devueltos por el servicio. */
  setOverride$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setOverride),
      mergeMap(({ analysisId, precio }) =>
        this.svc.setOverride(analysisId, precio).pipe(
          map(r => setOverrideSuccess({ analysisId: r.analysisId, precio: r.precio })),
        ),
      ),
    ),
  );
}
