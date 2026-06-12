import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { MuestrasApiService } from '../services/muestras-api.service';
import {
  initMuestras, initMuestrasSuccess, initMuestrasFailure,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
} from './muestras.actions';
import { selectMuestrasBranchId } from './muestras.selectors';
import type { TransitionKey } from '../models/transition.model';

@Injectable()
export class MuestrasEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MuestrasApiService);

  init$ = createEffect(() =>
    this.actions$.pipe(
      ofType(initMuestras),
      switchMap(() =>
        this.api.getMyBranches().pipe(
          map(branches => initMuestrasSuccess({
            branchId: branches[0].id,
            branchName: branches[0].name,
          })),
          catchError((error: HttpErrorResponse) => of(initMuestrasFailure({ error }))),
        ),
      ),
    ),
  );

  /** Al resolver la sucursal, carga inicial inmediata. */
  loadAfterInit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(initMuestrasSuccess),
      map(() => loadRecoleccion()),
    ),
  );

  loadRecoleccion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRecoleccion),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist('COLLECTED', branchId).pipe(
          map(res => isNotModified(res)
            ? loadRecoleccionNotModified()
            : loadRecoleccionSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadRecoleccionFailure({ error }))),
        );
      }),
    ),
  );

  transition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(transitionLabels),
      switchMap(({ labelIds, transitionKey, reason }) =>
        this.callTransition(labelIds, transitionKey, reason).pipe(
          map(() => transitionLabelsSuccess({ labelIds, transitionKey })),
          catchError((error: HttpErrorResponse) => of(transitionLabelsFailure({ error }))),
        ),
      ),
    ),
  );

  reloadAfterTransition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(transitionLabelsSuccess),
      map(() => loadRecoleccion()),
    ),
  );

  private callTransition(labelIds: number[], key: TransitionKey, reason?: string): Observable<unknown> {
    switch (key) {
      case 'transito':
        return this.api.updateStatus(labelIds, 'IN_TRANSIT');
      case 'rejected':
        return this.api.reject(labelIds, reason ?? '');
      case 'lost':
        return forkJoin(labelIds.map(id => this.api.markLost(id)));
      case 'rollback':
        return this.api.rollback(labelIds);
      default:
        // Recolección solo expone transito/rejected/lost/rollback; el resto es del arco mochila.
        return EMPTY;
    }
  }
}
