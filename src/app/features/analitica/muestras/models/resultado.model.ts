export interface AnalyticalResult {
  id: number; protocolId: number; analysisOrderId: number; sectionId: number; patientId: number;
}
export interface Determination {
  id: number; analyticalResultId: number; determinationCatalogId: number;
  resultValue: string | null; observations: string | null;
}
export type AnalyticalType = 'QUANTITATIVE' | 'QUALITATIVE' | 'SEMI_QUALITATIVE';

export interface DeterminationCatalogEntry {
  id: number; name: string; unit: string | null; referenceValues: string | null; analysisCatalogId: number;
  analyticalType?: AnalyticalType;
  qualitativeValues?: string[];
}

export interface GridCell { determinationId: number; value: string; }
export interface GridRow { catalogId: number; name: string; unit: string | null; cells: Record<number, GridCell | null>; }
export interface GridSection { analysisCatalogId: number; analysisName: string; resultIds: number[]; rows: GridRow[]; }
export interface ResultGrid { protocolIds: number[]; sections: GridSection[]; resultLabels: Partial<Record<number, string>>; }

// ---- Grid armado desde la PLANILLA (GAP-P1/P5) ----
// Las columnas son los PROTOCOLOS seleccionados (no los results). Cada análisis de
// la planilla es un bloque; las filas son sus determinaciones de catálogo. Para cada
// cruce (análisis × protocolo) se busca el AnalyticalResult de ese protocolo para ese
// análisis: si existe → celda editable; si no (la muestra no pidió el análisis) → la
// columna se muestra igual pero la celda NO persiste (GAP-P5).

/** Columna del grid de planilla: un protocolo (con su paciente).
 * `patientName` es el nombre resuelto del paciente (con fallback `Protocolo #pid`).
 * `label` se mantiene como alias de `patientName` por compatibilidad con consumidores existentes. */
export interface PlanillaColumn { protocolId: number; patientName: string; label: string; }

/** Celda de planilla: si `determinationId`/`resultId` son null, la celda no persiste. */
export interface PlanillaCell { resultId: number | null; determinationId: number | null; value: string; }

export interface PlanillaRow {
  catalogId: number; name: string; unit: string | null; cells: Record<number, PlanillaCell>;
  analyticalType: AnalyticalType;
  qualitativeValues: string[];
}

export interface PlanillaSection { analysisCatalogId: number; analysisName: string; rows: PlanillaRow[]; }

export interface PlanillaGrid {
  templateId: number;
  templateName: string;
  columns: PlanillaColumn[];               // un protocolo por columna
  sections: PlanillaSection[];             // un análisis de la planilla por bloque
}

export interface TemplateAnalysisRow { analysisTypeId: number; displayOrder: number; analysisName: string | null; }

export interface BuildPlanillaGridInput {
  templateId: number;
  templateName: string;
  templateAnalyses: TemplateAnalysisRow[];                       // análisis de la planilla (orden)
  determinationCatalogByAnalysis: Record<number, DeterminationCatalogEntry[]>; // filas por análisis
  protocolIds: number[];                                         // columnas
  patientNameByProtocol: Record<number, string>;
  // por (protocolId, analysisCatalogId) → el AnalyticalResult de ese protocolo para ese análisis
  resultByProtocolAnalysis: Record<string, AnalyticalResult | undefined>;
  determinationsByResult: Record<number, Determination[]>;
}

/** key estable protocolo+análisis. */
export const pAKey = (protocolId: number, analysisCatalogId: number): string => `${protocolId}:${analysisCatalogId}`;

export function buildPlanillaGrid(input: BuildPlanillaGridInput): PlanillaGrid {
  const {
    templateId, templateName, templateAnalyses, determinationCatalogByAnalysis,
    protocolIds, patientNameByProtocol, resultByProtocolAnalysis, determinationsByResult,
  } = input;

  const columns: PlanillaColumn[] = protocolIds.map(pid => {
    const patientName = patientNameByProtocol[pid] ?? `Protocolo #${pid}`;
    return { protocolId: pid, patientName, label: patientName };
  });

  const sections: PlanillaSection[] = [...templateAnalyses]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(ta => {
      const analysisCatalogId = ta.analysisTypeId;
      const catalogRows = determinationCatalogByAnalysis[analysisCatalogId] ?? [];

      const rows: PlanillaRow[] = catalogRows.map(cat => {
        const cells: Record<number, PlanillaCell> = {};
        for (const pid of protocolIds) {
          const result = resultByProtocolAnalysis[pAKey(pid, analysisCatalogId)];
          if (!result) {
            // GAP-P5: la muestra no pidió este análisis → celda visible pero no persiste.
            cells[pid] = { resultId: null, determinationId: null, value: '' };
            continue;
          }
          const det = (determinationsByResult[result.id] ?? [])
            .find(d => d.determinationCatalogId === cat.id);
          cells[pid] = det
            ? { resultId: result.id, determinationId: det.id, value: '' } // abrir en blanco; el back conserva lo guardado
            : { resultId: result.id, determinationId: null, value: '' };
        }
        return {
          catalogId: cat.id, name: cat.name, unit: cat.unit, cells,
          analyticalType: cat.analyticalType ?? 'QUANTITATIVE',
          qualitativeValues: cat.qualitativeValues ?? [],
        };
      });

      return { analysisCatalogId, analysisName: ta.analysisName ?? `#${analysisCatalogId}`, rows };
    });

  return { templateId, templateName, columns, sections };
}

export interface BuildGridInput {
  protocolIds: number[];
  results: AnalyticalResult[];
  determinationsByResult: Record<number, Determination[]>;
  catalogById: Record<number, DeterminationCatalogEntry>;
  analysisNameById: Record<number, string>;
  patientNameById: Record<number, string>;
}

/** Ensambla el modelo de grilla: secciones por análisis, filas = determination-catalog, columnas = results. */
export function buildResultGrid(input: BuildGridInput): ResultGrid {
  const { protocolIds, results, determinationsByResult, catalogById, analysisNameById, patientNameById } = input;

  const analysisOfResult = new Map<number, number>();
  for (const r of results) {
    const dets = determinationsByResult[r.id] ?? [];
    const firstCat = dets.length ? catalogById[dets[0].determinationCatalogId] : undefined;
    if (firstCat) analysisOfResult.set(r.id, firstCat.analysisCatalogId);
  }

  const resultsByAnalysis = new Map<number, number[]>();
  for (const r of results) {
    const ac = analysisOfResult.get(r.id);
    if (ac == null) continue;
    const arr = resultsByAnalysis.get(ac) ?? [];
    arr.push(r.id);
    resultsByAnalysis.set(ac, arr);
  }

  const sections: GridSection[] = [...resultsByAnalysis.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([analysisCatalogId, resultIds]) => {
      const catalogIds = [...new Set(
        resultIds.flatMap(rid => (determinationsByResult[rid] ?? []).map(d => d.determinationCatalogId)),
      )].sort((a, b) => a - b);

      const rows: GridRow[] = catalogIds.map(catalogId => {
        const cat = catalogById[catalogId];
        const cells: Record<number, GridCell | null> = {};
        for (const rid of resultIds) {
          const det = (determinationsByResult[rid] ?? []).find(d => d.determinationCatalogId === catalogId);
          cells[rid] = det ? { determinationId: det.id, value: det.resultValue ?? '' } : null;
        }
        return { catalogId, name: cat?.name ?? `#${catalogId}`, unit: cat?.unit ?? null, cells };
      });

      return { analysisCatalogId, analysisName: analysisNameById[analysisCatalogId] ?? `#${analysisCatalogId}`, resultIds, rows };
    });

  const resultLabels: Record<number, string> = {};
  for (const r of results) resultLabels[r.id] = patientNameById[r.patientId] ?? `#${r.id}`;

  return { protocolIds, sections, resultLabels };
}
