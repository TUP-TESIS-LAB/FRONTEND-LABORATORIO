import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { AnaliticaMetricsApiService } from '../../services/analitica-metrics-api.service';
import {
  loadPostanaliticaTab, loadPostanaliticaTabFailure, loadPostanaliticaTabSuccess,
  loadPreanaliticaTab, loadPreanaliticaTabFailure, loadPreanaliticaTabSuccess,
  loadVolumenTab, loadVolumenTabFailure, loadVolumenTabSuccess,
} from './analitica-metrics.actions';
import { selectPostanaliticaTabData, selectPreanaliticaTabData, selectVolumenTabData } from './analitica-metrics.selectors';

/** 403 = sin acceso a la sucursal filtrada (`BranchAccessDeniedException`); resto genérico. */
function mapMetricsError(e: HttpErrorResponse): string {
  if (e.status === 403) return 'No tenés acceso a la sucursal seleccionada.';
  return 'No se pudieron cargar las métricas. Intentá de nuevo.';
}

/**
 * Cada tab del dashboard (Volumen / Preanalítica / Postanalítica) necesita VARIOS
 * endpoints de métricas por poll-tick. En vez de una acción NgRx 1:1 por endpoint (que
 * multiplicaría este slice a ~50 acciones), cada `load*Tab` dispara un `forkJoin` de los
 * GETs de esa tab; por cada respuesta se resuelve el 304 (`isNotModified`) cayendo al
 * valor previo del state (`withLatestFrom`) para no pisar datos buenos con el sentinel
 * `NotModified`, y se despacha UN `*TabSuccess` combinado.
 */
@Injectable()
export class AnaliticaMetricsEffects {
  private readonly actions$     = inject(Actions);
  private readonly store        = inject(Store);
  private readonly api          = inject(AnaliticaMetricsApiService);
  private readonly notification = inject(NotificationService);

  loadVolumenTab$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadVolumenTab),
      switchMap(({ filter }) =>
        forkJoin({
          volumen: this.api.getVolumen(filter),
          volumenPorSeccion: this.api.getVolumenPorSeccion(filter),
          demografia: this.api.getDemografia(filter),
          subEstados: this.api.getSubEstados(filter),
        }).pipe(
          withLatestFrom(this.store.select(selectVolumenTabData)),
          map(([res, prev]) => loadVolumenTabSuccess({
            data: {
              volumen: isNotModified(res.volumen) ? prev.volumen : res.volumen,
              volumenPorSeccion: isNotModified(res.volumenPorSeccion) ? prev.volumenPorSeccion : res.volumenPorSeccion,
              demografia: isNotModified(res.demografia) ? prev.demografia : res.demografia,
              subEstados: isNotModified(res.subEstados) ? prev.subEstados : res.subEstados,
            },
          })),
          catchError((e: HttpErrorResponse) => {
            const error = mapMetricsError(e);
            this.notification.error(error);
            return of(loadVolumenTabFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadPreanaliticaTab$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPreanaliticaTab),
      switchMap(({ filter }) =>
        forkJoin({
          volumenTendencia: this.api.getPreanaliticaVolumenTendencia(filter),
          rechazoResumen: this.api.getPreanaliticaRechazoResumen(filter),
          perdidasResumen: this.api.getPreanaliticaPerdidasResumen(filter),
          rechazoPorSeccion: this.api.getPreanaliticaRechazoPorSeccion(filter),
        }).pipe(
          withLatestFrom(this.store.select(selectPreanaliticaTabData)),
          map(([res, prev]) => loadPreanaliticaTabSuccess({
            data: {
              volumenTendencia: isNotModified(res.volumenTendencia) ? prev.volumenTendencia : res.volumenTendencia,
              rechazoResumen: isNotModified(res.rechazoResumen) ? prev.rechazoResumen : res.rechazoResumen,
              perdidasResumen: isNotModified(res.perdidasResumen) ? prev.perdidasResumen : res.perdidasResumen,
              rechazoPorSeccion: isNotModified(res.rechazoPorSeccion) ? prev.rechazoPorSeccion : res.rechazoPorSeccion,
            },
          })),
          catchError((e: HttpErrorResponse) => {
            const error = mapMetricsError(e);
            this.notification.error(error);
            return of(loadPreanaliticaTabFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadPostanaliticaTab$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPostanaliticaTab),
      switchMap(({ filter }) =>
        forkJoin({
          tatPromedio: this.api.getPostanaliticaTatPromedio(filter),
          tatSerie: this.api.getPostanaliticaTatSerie(filter),
          estudiosTotal: this.api.getPostanaliticaEstudiosTotal(filter),
          estudiosPorEstado: this.api.getPostanaliticaEstudiosPorEstado(filter),
        }).pipe(
          withLatestFrom(this.store.select(selectPostanaliticaTabData)),
          map(([res, prev]) => loadPostanaliticaTabSuccess({
            data: {
              tatPromedio: isNotModified(res.tatPromedio) ? prev.tatPromedio : res.tatPromedio,
              tatSerie: isNotModified(res.tatSerie) ? prev.tatSerie : res.tatSerie,
              estudiosTotal: isNotModified(res.estudiosTotal) ? prev.estudiosTotal : res.estudiosTotal,
              estudiosPorEstado: isNotModified(res.estudiosPorEstado) ? prev.estudiosPorEstado : res.estudiosPorEstado,
            },
          })),
          catchError((e: HttpErrorResponse) => {
            const error = mapMetricsError(e);
            this.notification.error(error);
            return of(loadPostanaliticaTabFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
