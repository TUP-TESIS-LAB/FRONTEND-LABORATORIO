export interface AnalyticalResult {
  id: number; protocolId: number; analysisOrderId: number; sectionId: number; patientId: number;
}
export interface Determination {
  id: number; analyticalResultId: number; determinationCatalogId: number;
  resultValue: string | null; observations: string | null;
}
export interface DeterminationCatalogEntry {
  id: number; name: string; unit: string | null; referenceValues: string | null; analysisCatalogId: number;
}

export interface GridCell { determinationId: number; value: string; }
export interface GridRow { catalogId: number; name: string; unit: string | null; cells: Record<number, GridCell | null>; }
export interface GridSection { analysisCatalogId: number; analysisName: string; resultIds: number[]; rows: GridRow[]; }
export interface ResultGrid { protocolId: number; sections: GridSection[]; }

export interface BuildGridInput {
  protocolId: number;
  results: AnalyticalResult[];
  determinationsByResult: Record<number, Determination[]>;
  catalogById: Record<number, DeterminationCatalogEntry>;
  analysisNameById: Record<number, string>;
}

/** Ensambla el modelo de grilla: secciones por análisis, filas = determination-catalog, columnas = results. */
export function buildResultGrid(input: BuildGridInput): ResultGrid {
  const { protocolId, results, determinationsByResult, catalogById, analysisNameById } = input;

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

  return { protocolId, sections };
}
