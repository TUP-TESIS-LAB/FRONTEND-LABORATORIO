import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, mergeMap, of, switchMap } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { SectionService } from '@features/sucursales/services/section.service';

import {
  loadSecciones, loadSeccionesSuccess, loadSeccionesFailure,
  loadCountBySection, loadCountBySectionSuccess, loadCountBySectionFailure,
  loadUnassignedCount, loadUnassignedCountSuccess, loadUnassignedCountFailure,
  addSeccion, addSeccionSuccess, addSeccionFailure,
  updateSeccion, updateSeccionSuccess, updateSeccionFailure,
  deleteSeccion, deleteSeccionSuccess, deleteSeccionFailure,
} from './secciones.actions';

/** Store de la tab "Secciones" de Empresa (KAN-218) — mutación pesimista, sin polling. */
@Injectable()
export class SeccionesEffects {
  private readonly actions$ = inject(Actions);
  private readonly sectionService = inject(SectionService);
  private readonly analysisService = inject(AnalysisService);
  private readonly notifications = inject(NotificationService);

  // ── Lecturas ────────────────────────────────────────────────────────────

  loadSecciones$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSecciones),
      switchMap(() =>
        this.sectionService.listWithBranches({ page: 0, size: 100 }).pipe(
          map((page) => loadSeccionesSuccess({ items: page.content })),
          catchError((error: HttpErrorResponse) => of(loadSeccionesFailure({ error }))),
        ),
      ),
    ),
  );

  loadCountBySection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCountBySection),
      switchMap(() =>
        this.analysisService.countBySection().pipe(
          map((countMap) => loadCountBySectionSuccess({ countMap })),
          catchError((error: HttpErrorResponse) => of(loadCountBySectionFailure({ error }))),
        ),
      ),
    ),
  );

  loadUnassignedCount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUnassignedCount),
      switchMap(() =>
        this.analysisService.unassignedCount().pipe(
          map((count) => loadUnassignedCountSuccess({ count })),
          catchError((error: HttpErrorResponse) => of(loadUnassignedCountFailure({ error }))),
        ),
      ),
    ),
  );

  // ── Mutaciones ────────────────────────────────────────────────────────────

  /** Crear: primero la sección (para obtener el id), luego asignar sus análisis. */
  addSeccion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addSeccion),
      exhaustMap(({ name, analysisIds }) =>
        this.sectionService.create({ name }).pipe(
          switchMap((section) =>
            this.analysisService.setSectionAnalyses(section.id, analysisIds).pipe(
              map(() => addSeccionSuccess()),
            ),
          ),
          catchError((error: HttpErrorResponse) => of(addSeccionFailure({ error }))),
        ),
      ),
    ),
  );

  /** Editar: actualizar el nombre y luego re-setear sus análisis. */
  updateSeccion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateSeccion),
      concatMap(({ id, name, analysisIds }) =>
        this.sectionService.update(id, { name }).pipe(
          switchMap(() =>
            this.analysisService.setSectionAnalyses(id, analysisIds).pipe(
              map(() => updateSeccionSuccess()),
            ),
          ),
          catchError((error: HttpErrorResponse) => of(updateSeccionFailure({ error }))),
        ),
      ),
    ),
  );

  deleteSeccion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSeccion),
      mergeMap(({ id }) =>
        this.sectionService.delete(id).pipe(
          map(() => deleteSeccionSuccess({ id })),
          catchError((error: HttpErrorResponse) => of(deleteSeccionFailure({ error }))),
        ),
      ),
    ),
  );

  // ── Refetch tras mutación pesimista ─────────────────────────────────────────
  // Tras add/update/delete se re-cargan el listado y el conteo (unassigned puede
  // cambiar al mover análisis dentro/fuera de una sección).

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addSeccionSuccess, updateSeccionSuccess, deleteSeccionSuccess),
      switchMap(() => [loadSecciones(), loadCountBySection(), loadUnassignedCount()]),
    ),
  );

  // ── Toasts (no dispatch) ────────────────────────────────────────────────────

  addSeccionToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addSeccionSuccess),
        map(() => this.notifications.success('Sección creada')),
      ),
    { dispatch: false },
  );

  updateSeccionToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateSeccionSuccess),
        map(() => this.notifications.success('Sección actualizada')),
      ),
    { dispatch: false },
  );

  deleteSeccionToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteSeccionSuccess),
        map(() => this.notifications.success('Sección eliminada')),
      ),
    { dispatch: false },
  );
}
