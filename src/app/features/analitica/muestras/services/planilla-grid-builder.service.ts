import { inject, Injectable } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ResultadosApiService } from './resultados-api.service';
import { WorksheetTemplatesApiService } from './worksheet-templates-api.service';
import { PacientesApiService } from './pacientes-api.service';
import {
  buildPlanillaGrid, pAKey,
  type PlanillaGrid, type AnalyticalResult, type Determination,
  type DeterminationCatalogEntry, type TemplateAnalysisRow,
} from '../models/resultado.model';

/**
 * GAP-P1: arma el grid de carga desde la PLANILLA (sus análisis) y los PROTOCOLOS
 * seleccionados. Orquesta los endpoints existentes (no requiere endpoint nuevo):
 *  - GET /worksheets/templates/{id}/form → análisis de la planilla (+ nombre)
 *  - GET /determination-catalog?analysisId=... → filas por análisis
 *  - GET /resultados/protocol/{id} → results del protocolo
 *  - GET /resultados/{id}/determinations → valores cargados
 *  - pacientes.getByIds → rótulo de columna
 */
@Injectable({ providedIn: 'root' })
export class PlanillaGridBuilderService {
  private readonly resultados = inject(ResultadosApiService);
  private readonly templates = inject(WorksheetTemplatesApiService);
  private readonly pacientes = inject(PacientesApiService);

  build(templateId: number, protocolIds: number[]): Observable<PlanillaGrid> {
    // KAN-227: para protocolos con órdenes derivadas sin result, materializarlos ANTES de leerlos.
    // El back decide cuáles son derivadas; es idempotente (no recrea si ya existen).
    const prep$ = protocolIds.length
      ? this.resultados.receiveExternalResult(protocolIds).pipe(catchError(() => of(null)))
      : of(null);
    return prep$.pipe(switchMap(() => forkJoin({
      form: this.templates.getForm(templateId),
      resultsByProtocol: protocolIds.length
        ? forkJoin(protocolIds.map(pid =>
            this.resultados.getResultsByProtocol(pid).pipe(map(rs => [pid, rs] as const))))
        : of([] as (readonly [number, AnalyticalResult[]])[]),
    }).pipe(
      switchMap(({ form, resultsByProtocol }) => {
        const templateAnalyses: TemplateAnalysisRow[] = form.analyses.map(a => ({
          analysisTypeId: a.analysisTypeId, displayOrder: a.displayOrder, analysisName: a.analysisName,
        }));
        const analysisIds = [...new Set(templateAnalyses.map(a => a.analysisTypeId))];

        // result por (protocolo, análisis): el AnalyticalResult cuya orden es de ese catálogo.
        // Como no tenemos el catalogId en el result, lo inferimos por sus determinaciones
        // (sectionId no alcanza). Se resuelve más abajo con las determinaciones cargadas.
        const allResults: AnalyticalResult[] = resultsByProtocol.flatMap(([, rs]) => rs);
        const protocolByResult = new Map<number, number>();
        for (const [pid, rs] of resultsByProtocol) for (const r of rs) protocolByResult.set(r.id, pid);

        const patientIds = [...new Set(allResults.map(r => r.patientId))];

        const dets$ = allResults.length
          ? forkJoin(allResults.map(r =>
              this.resultados.getDeterminations(r.id).pipe(map(d => [r.id, d] as const))))
          : of([] as (readonly [number, Determination[]])[]);

        const catalogByAnalysis$ = analysisIds.length
          ? forkJoin(analysisIds.map(aid =>
              this.resultados.getDeterminationCatalogByAnalysis(aid).pipe(map(c => [aid, c] as const))))
          : of([] as (readonly [number, DeterminationCatalogEntry[]])[]);

        return forkJoin({
          dets: dets$,
          catalogByAnalysis: catalogByAnalysis$,
          patients: this.pacientes.getByIds(patientIds),
        }).pipe(
          map(({ dets, catalogByAnalysis, patients }) => {
            const determinationsByResult: Record<number, Determination[]> = Object.fromEntries(dets);
            const determinationCatalogByAnalysis: Record<number, DeterminationCatalogEntry[]> =
              Object.fromEntries(catalogByAnalysis);
            const patientNameById = Object.fromEntries(
              patients.map(p => [p.id, `${p.firstName} ${p.lastName}`.trim()]));
            const patientNameByProtocol: Record<number, string> = {};
            for (const r of allResults) {
              const pid = protocolByResult.get(r.id);
              if (pid != null) patientNameByProtocol[pid] = patientNameById[r.patientId] ?? `Protocolo #${pid}`;
            }

            // Map (protocolo, análisis) → result. El análisis del result se infiere por el
            // analysisCatalogId de su primera determinación de catálogo.
            const analysisOfResult = new Map<number, number>();
            const catEntryById = new Map<number, DeterminationCatalogEntry>();
            for (const list of Object.values(determinationCatalogByAnalysis))
              for (const c of list) catEntryById.set(c.id, c);
            for (const r of allResults) {
              const firstDet = (determinationsByResult[r.id] ?? [])[0];
              const cat = firstDet ? catEntryById.get(firstDet.determinationCatalogId) : undefined;
              if (cat) analysisOfResult.set(r.id, cat.analysisCatalogId);
            }
            const resultByProtocolAnalysis: Record<string, AnalyticalResult | undefined> = {};
            for (const r of allResults) {
              const pid = protocolByResult.get(r.id);
              const aid = analysisOfResult.get(r.id);
              if (pid != null && aid != null) resultByProtocolAnalysis[pAKey(pid, aid)] = r;
            }

            return buildPlanillaGrid({
              templateId, templateName: form.templateName, templateAnalyses,
              determinationCatalogByAnalysis, protocolIds, patientNameByProtocol,
              resultByProtocolAnalysis, determinationsByResult,
            });
          }),
        );
      }),
    )));
  }
}
