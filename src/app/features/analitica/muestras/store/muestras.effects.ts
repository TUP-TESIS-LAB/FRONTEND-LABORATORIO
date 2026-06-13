import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { MuestrasApiService } from '../services/muestras-api.service';
import {
  initMuestras, initMuestrasSuccess, initMuestrasFailure,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
  loadTransito, loadTransitoSuccess, loadTransitoNotModified, loadTransitoFailure,
  loadDescarte, loadDescarteSuccess, loadDescarteNotModified, loadDescarteFailure,
  loadProcesamiento, loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
  resolveRouting, resolveRoutingSuccess, resolveRoutingFailure,
  loadWorkspaces, loadWorkspacesSuccess, loadWorkspacesFailure,
  dispatchTubes, dispatchTubesSuccess, dispatchTubesFailure,
  deriveTubes, deriveTubesSuccess, deriveTubesFailure,
} from './muestras.actions';
import { selectMuestrasBranchId, selectTransitoItems } from './muestras.selectors';
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
          map(branches => {
            if (!branches.length) {
              throw new HttpErrorResponse({ status: 404, error: 'Sin sucursales asignadas' });
            }
            return initMuestrasSuccess({
              branchId: branches[0].id,
              branchName: branches[0].name,
              branches,
            });
          }),
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
      concatMap(({ labelIds, transitionKey, reason }) =>
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

  loadTransito$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTransito),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist('IN_TRANSIT', branchId).pipe(
          map(res => isNotModified(res) ? loadTransitoNotModified() : loadTransitoSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadTransitoFailure({ error }))),
        );
      }),
    ),
  );

  loadDescarte$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDescarte),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist('REJECTED,LOST,DISCARDED', branchId).pipe(
          map(res => isNotModified(res) ? loadDescarteNotModified() : loadDescarteSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadDescarteFailure({ error }))),
        );
      }),
    ),
  );

  loadProcesamiento$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProcesamiento),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist('PROCESSING', branchId).pipe(
          map(res => isNotModified(res) ? loadProcesamientoNotModified() : loadProcesamientoSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadProcesamientoFailure({ error }))),
        );
      }),
    ),
  );

  resolveRouting$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolveRouting),
      withLatestFrom(this.store.select(selectMuestrasBranchId), this.store.select(selectTransitoItems)),
      switchMap(([, branchId, items]) => {
        const protocolIds = [...new Set(items.map(i => i.protocolId))];
        if (branchId == null || protocolIds.length === 0) return EMPTY;
        return this.api.resolveRouting(protocolIds, branchId).pipe(
          map(routing => resolveRoutingSuccess({ routing })),
          catchError((error: HttpErrorResponse) => of(resolveRoutingFailure({ error }))),
        );
      }),
    ),
  );

  // El resolve necesita los items cargados: re-disparar tras cada Success (los 304 no pasan por acá).
  resolveAfterTransitoLoad$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTransitoSuccess),
      map(() => resolveRouting()),
    ),
  );

  loadWorkspaces$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadWorkspaces),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => branchId == null ? EMPTY :
        this.api.getBranchWorkspaces(branchId).pipe(
          map(workspaces => loadWorkspacesSuccess({ workspaces })),
          catchError((error: HttpErrorResponse) => of(loadWorkspacesFailure({ error }))),
        )),
    ),
  );

  dispatchTubes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(dispatchTubes),
      concatMap(({ checkIns }) =>
        this.api.dispatch(checkIns).pipe(
          map(() => dispatchTubesSuccess({ count: checkIns.length })),
          catchError((error: HttpErrorResponse) => of(dispatchTubesFailure({ error }))),
        )),
    ),
  );

  deriveTubes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deriveTubes),
      concatMap(({ labelIds, destinationBranchId, tubeCount, observation }) =>
        this.api.sendToBranch(labelIds, destinationBranchId, observation).pipe(
          map(() => deriveTubesSuccess({ count: tubeCount })),
          catchError((error: HttpErrorResponse) => of(deriveTubesFailure({ error }))),
        )),
    ),
  );

  /** Tras cualquier despacho/derivación: recargar tránsito (resolveAfterTransitoLoad$ encadena el routing). */
  reloadAfterDispatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(dispatchTubesSuccess, deriveTubesSuccess),
      map(() => loadTransito()),
    ),
  );

  private callTransition(labelIds: number[], key: TransitionKey, reason?: string): Observable<unknown> {
    switch (key) {
      case 'transito':
        return this.api.updateStatus(labelIds, 'IN_TRANSIT');
      case 'rejected':
        return this.api.reject(labelIds, reason ?? '');
      case 'lost':
        return labelIds.length ? forkJoin(labelIds.map(id => this.api.markLost(id))) : of(null);
      case 'rollback':
        return this.api.rollback(labelIds);
      default:
        // Recolección solo expone transito/rejected/lost/rollback; el resto es del arco mochila.
        return EMPTY;
    }
  }
}
