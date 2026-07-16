import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, map, switchMap } from 'rxjs';
import { FlujoMetricsApiService } from '../../services/flujo-metrics-api.service';
import {
  loadFlujoEnVivo,
  loadFlujoEnVivoSuccess,
  loadFlujoHistorico,
  loadFlujoHistoricoSuccess,
} from './flujo-metrics.actions';
import { safeFetch } from './flujo-metrics-fetch.util';

@Injectable()
export class FlujoMetricsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(FlujoMetricsApiService);

  // ── FOP-01..07 (histórico, polleado ETag/304) ───────────────────────────
  loadHistorico$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFlujoHistorico),
      switchMap(({ filter }) =>
        forkJoin({
          volumenTurnos: safeFetch(this.api.getVolumenTurnos(filter)),
          volumenCola: safeFetch(this.api.getVolumenCola(filter)),
          tasaCancelacion: safeFetch(this.api.getTasaCancelacion(filter)),
          ocupacionAgenda: safeFetch(this.api.getOcupacionAgenda(filter)),
          esperaLlamado: safeFetch(this.api.getEsperaLlamado(filter)),
          reLlamados: safeFetch(this.api.getReLlamados(filter)),
          cargaExtractor: safeFetch(this.api.getCargaExtractor(filter)),
        }).pipe(map((results) => loadFlujoHistoricoSuccess({ results }))),
      ),
    ),
  );

  // ── FOP-08..10 (en vivo, gauges snapshot, polleado ETag/304) ────────────
  loadEnVivo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFlujoEnVivo),
      switchMap(({ branchId }) =>
        forkJoin({
          colaExtraccionVivo: safeFetch(this.api.getColaExtraccionVivo(branchId)),
          ocupacionBoxesVivo: safeFetch(this.api.getOcupacionBoxesVivo(branchId)),
          urgentes: safeFetch(this.api.getUrgentes(branchId)),
        }).pipe(map((results) => loadFlujoEnVivoSuccess({ results }))),
      ),
    ),
  );
}
