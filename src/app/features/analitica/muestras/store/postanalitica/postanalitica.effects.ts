import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { buildValidationView } from '../../models/postanalitica.model';
import type { Study, ResultWithValidation } from '../../models/postanalitica.model';
import { selectValidationView } from './postanalitica.selectors';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';

@Injectable()
export class PostanaliticaEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);
  private readonly resultados = inject(ResultadosApiService);

  loadValidation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadValidation),
      switchMap(({ protocolId }) =>
        forkJoin({
          study: this.api.getStudy(protocolId).pipe(catchError(() => of(null as Study | null))),
          rwv: this.api.getResultsValidation(protocolId).pipe(catchError(() => of([] as ResultWithValidation[]))),
        }).pipe(
          switchMap(({ study, rwv }) => {
            if (!rwv.length) {
              return of(buildValidationView({ protocolId, study, resultsWithValidation: [], nameByDeterminationId: {} }));
            }
            return forkJoin(rwv.map(r => this.resultados.getDeterminations(r.result.analyticResultId))).pipe(
              switchMap(detsPerResult => {
                const detIdToCatalog: Record<number, number> = {};
                for (const dets of detsPerResult) for (const d of dets) detIdToCatalog[d.id] = d.determinationCatalogId;
                const catalogIds = [...new Set(Object.values(detIdToCatalog))];
                const catalogs$ = catalogIds.length ? forkJoin(catalogIds.map(id => this.resultados.getDeterminationCatalog(id))) : of([]);
                return catalogs$.pipe(
                  map(catalogs => {
                    const nameByCatalog = Object.fromEntries(catalogs.map(c => [c.id, c.name]));
                    const nameByDeterminationId: Record<number, string> = {};
                    for (const [detId, catId] of Object.entries(detIdToCatalog)) {
                      nameByDeterminationId[Number(detId)] = nameByCatalog[catId] ?? `#${detId}`;
                    }
                    return buildValidationView({ protocolId, study, resultsWithValidation: rwv, nameByDeterminationId });
                  }),
                );
              }),
            );
          }),
          map(view => loadValidationSuccess({ view })),
          catchError((error: HttpErrorResponse) => of(loadValidationFailure({ error }))),
        ),
      ),
    ),
  );

  validateDet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateDet),
      switchMap(({ resultId, determinationId, outcome }) =>
        this.api.validateDetermination(resultId, determinationId, outcome).pipe(
          map(() => validateDetSuccess()),
          catchError((error: HttpErrorResponse) => of(validateDetFailure({ error }))),
        ),
      ),
    ),
  );

  validateAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateAll),
      switchMap(({ resultId, outcome }) =>
        this.api.validateAll(resultId, outcome).pipe(
          map(() => validateAllSuccess()),
          catchError((error: HttpErrorResponse) => of(validateAllFailure({ error }))),
        ),
      ),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateDetSuccess, validateAllSuccess),
      withLatestFrom(this.store.select(selectValidationView)),
      filter(([, view]) => view != null),
      map(([, view]) => loadValidation({ protocolId: view!.protocolId })),
    ),
  );
}
