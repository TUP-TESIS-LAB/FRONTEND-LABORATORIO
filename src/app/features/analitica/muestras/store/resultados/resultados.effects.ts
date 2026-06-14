import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { buildResultGrid } from '../../models/resultado.model';
import { selectGrid } from './resultados.selectors';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';

@Injectable()
export class ResultadosEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(ResultadosApiService);
  private readonly analysis = inject(AnalysisService);

  loadGrid$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadGrid),
      switchMap(({ protocolId }) =>
        this.api.getResultsByProtocol(protocolId).pipe(
          switchMap(results => {
            if (!results.length) {
              return of(buildResultGrid({ protocolId, results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {} }));
            }
            return forkJoin(results.map(r => this.api.getDeterminations(r.id).pipe(map(dets => [r.id, dets] as const)))).pipe(
              switchMap(pairs => {
                const determinationsByResult = Object.fromEntries(pairs);
                const catalogIds = [...new Set(pairs.flatMap(([, dets]) => dets.map(d => d.determinationCatalogId)))];
                const catalogs$ = catalogIds.length ? forkJoin(catalogIds.map(id => this.api.getDeterminationCatalog(id))) : of([]);
                return catalogs$.pipe(
                  switchMap(catalogs => {
                    const catalogById = Object.fromEntries(catalogs.map(c => [c.id, c]));
                    const analysisIds = [...new Set(catalogs.map(c => c.analysisCatalogId))];
                    const names$ = analysisIds.length
                      ? forkJoin(analysisIds.map(id => this.analysis.getById(id).pipe(map(a => [id, a.name] as const))))
                      : of([]);
                    return names$.pipe(
                      map(namePairs => buildResultGrid({ protocolId, results, determinationsByResult, catalogById, analysisNameById: Object.fromEntries(namePairs) })),
                    );
                  }),
                );
              }),
            );
          }),
          map(grid => loadGridSuccess({ grid })),
          catchError((error: HttpErrorResponse) => of(loadGridFailure({ error }))),
        ),
      ),
    ),
  );

  saveResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveResults),
      switchMap(({ results }) => {
        if (!results.length) return of(saveResultsSuccess());
        return forkJoin(results.map(r => this.api.batchUpdate(r.resultId, r.items))).pipe(
          map(() => saveResultsSuccess()),
          catchError((error: HttpErrorResponse) => of(saveResultsFailure({ error }))),
        );
      }),
    ),
  );

  markReady$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markReady),
      switchMap(({ resultIds }) => {
        if (!resultIds.length) return of(markReadySuccess());
        return forkJoin(resultIds.map(id => this.api.markReady(id))).pipe(
          map(() => markReadySuccess()),
          catchError((error: HttpErrorResponse) => of(markReadyFailure({ error }))),
        );
      }),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveResultsSuccess, markReadySuccess),
      withLatestFrom(this.store.select(selectGrid)),
      filter(([, grid]) => grid != null),
      map(([, grid]) => loadGrid({ protocolId: grid!.protocolId })),
    ),
  );
}
