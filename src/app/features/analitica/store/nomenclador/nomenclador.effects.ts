import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of, shareReplay } from 'rxjs';
import { NomencladorService } from '../../services/nomenclador.service';
import { NbuConfigApiService } from '../../services/nbu-config-api.service';
import { SectionService } from '../../../sucursales/services/section.service';
import { Section } from '../../../sucursales/models/section.model';
import { ConfigResumen } from '../../models/nomenclador.model';
import {
  loadConfigResumen,
  loadConfigResumenFailure,
  loadConfigResumenSuccess,
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
  private readonly nbuConfig = inject(NbuConfigApiService);
  private readonly sections = inject(SectionService);

  /**
   * Lista de secciones del tenant cacheada (shareReplay): se pide una sola vez y se
   * reutiliza para resolver el nombre de sección en cada resumen de config.
   */
  private sections$?: Observable<Section[]>;
  private sectionList(): Observable<Section[]> {
    this.sections$ ??= this.sections.list({ size: 200 }).pipe(
      map(page => page.content),
      catchError(() => of([] as Section[])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sections$;
  }

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
          map(({ nbuCode, determinations }) =>
            loadDeterminationsSuccess({ analysisId, nbuCode, determinations }),
          ),
          catchError(() => of(loadDeterminationsSuccess({ analysisId, nbuCode: null, determinations: [] }))),
        ),
      ),
    ),
  );

  /**
   * Carga lazy del resumen de config de un análisis (bloque CONFIGURACIÓN del tab Catálogo).
   * Usa mergeMap para permitir cargas simultáneas de distintos analysisId.
   * Combina la fila de tenant_analysis (sección/activo/id), el nombre de sección (lista cacheada)
   * y el override de la 1ª determinación (ayuno + config propia). En error: failure (no rompe la fila).
   */
  loadConfigResumen$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadConfigResumen),
      mergeMap(({ analysisId }) =>
        forkJoin({
          tenantAnalyses: this.nbuConfig.listTenantAnalyses(),
          sections: this.sectionList(),
          determinations: this.svc.getDeterminations(analysisId),
        }).pipe(
          mergeMap(({ tenantAnalyses, sections, determinations }) => {
            const ta = tenantAnalyses.find(t => t.catalogId === analysisId) ?? null;
            const sectionId = ta?.defaultSectionId ?? null;
            const sectionName = sectionId == null
              ? null
              : (sections.find(s => s.id === sectionId)?.name ?? null);
            const base: ConfigResumen = {
              tenantAnalysisId: ta?.id ?? null,
              sectionId,
              sectionName,
              ayuno: null,
              active: ta?.active ?? false,
              hasCustomConfig: false,
            };

            const firstDet = determinations.determinations[0];
            if (!firstDet) {
              return of(loadConfigResumenSuccess({ analysisId, resumen: base }));
            }
            return this.nbuConfig.getOverride(firstDet.id).pipe(
              map(resp =>
                loadConfigResumenSuccess({
                  analysisId,
                  resumen: {
                    ...base,
                    ayuno: resp.override?.preIndications ?? null,
                    hasCustomConfig: resp.hasOverride,
                  },
                }),
              ),
            );
          }),
          catchError(() => of(loadConfigResumenFailure({ analysisId }))),
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
