import { describe, expect, it } from 'vitest';
import { buildResultGrid } from './resultado.model';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from './resultado.model';

const results: AnalyticalResult[] = [
  { id: 1, protocolId: 9, analysisOrderId: 100, sectionId: 80012, patientId: 20002 },
  { id: 2, protocolId: 9, analysisOrderId: 101, sectionId: 80012, patientId: 20002 },
];
const determinationsByResult: Record<number, Determination[]> = {
  1: [{ id: 11, analyticalResultId: 1, determinationCatalogId: 500, resultValue: '180', observations: null }],
  2: [{ id: 21, analyticalResultId: 2, determinationCatalogId: 501, resultValue: null, observations: null }],
};
const catalogById: Record<number, DeterminationCatalogEntry> = {
  500: { id: 500, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 },
  501: { id: 501, name: 'Triglicéridos', unit: 'mg/dL', referenceValues: '< 150', analysisCatalogId: 7 },
};
const analysisNameById: Record<number, string> = { 6: 'Colesterol Total', 7: 'Triglicéridos' };

describe('buildResultGrid', () => {
  it('agrupa results por análisis y arma filas/columnas/celdas', () => {
    const grid = buildResultGrid({ protocolId: 9, results, determinationsByResult, catalogById, analysisNameById });
    expect(grid.protocolId).toBe(9);
    expect(grid.sections).toHaveLength(2);
    const colSec = grid.sections.find(s => s.analysisCatalogId === 6)!;
    expect(colSec.analysisName).toBe('Colesterol Total');
    expect(colSec.resultIds).toEqual([1]);
    expect(colSec.rows).toHaveLength(1);
    expect(colSec.rows[0].name).toBe('Colesterol Total');
    expect(colSec.rows[0].cells[1]).toEqual({ determinationId: 11, value: '180' });
  });

  it('celda vacía cuando resultValue es null', () => {
    const grid = buildResultGrid({ protocolId: 9, results, determinationsByResult, catalogById, analysisNameById });
    const sec = grid.sections.find(s => s.analysisCatalogId === 7)!;
    expect(sec.rows[0].cells[2]).toEqual({ determinationId: 21, value: '' });
  });

  it('sin results → sin secciones', () => {
    const grid = buildResultGrid({ protocolId: 9, results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {} });
    expect(grid.sections).toEqual([]);
  });
});
