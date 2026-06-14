import { describe, expect, it } from 'vitest';
import { buildResultGrid } from './resultado.model';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from './resultado.model';

const results: AnalyticalResult[] = [
  { id: 1, protocolId: 9, analysisOrderId: 100, sectionId: 80012, patientId: 20002 },
  { id: 2, protocolId: 10, analysisOrderId: 101, sectionId: 80012, patientId: 20003 },
];
const determinationsByResult: Record<number, Determination[]> = {
  1: [{ id: 11, analyticalResultId: 1, determinationCatalogId: 500, resultValue: '180', observations: null }],
  2: [{ id: 21, analyticalResultId: 2, determinationCatalogId: 500, resultValue: null, observations: null }],
};
const catalogById: Record<number, DeterminationCatalogEntry> = {
  500: { id: 500, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 },
};
const analysisNameById = { 6: 'Colesterol Total' };
const patientNameById = { 20002: 'Ana López', 20003: 'Juan Pérez' };

describe('buildResultGrid', () => {
  it('mergea results de distintos protocolos en una sección (columnas)', () => {
    const grid = buildResultGrid({ protocolIds: [9, 10], results, determinationsByResult, catalogById, analysisNameById, patientNameById });
    expect(grid.protocolIds).toEqual([9, 10]);
    expect(grid.sections).toHaveLength(1);
    const sec = grid.sections[0];
    expect(sec.analysisCatalogId).toBe(6);
    expect(sec.resultIds).toEqual([1, 2]);
    expect(sec.rows[0].cells[1]).toEqual({ determinationId: 11, value: '180' });
    expect(sec.rows[0].cells[2]).toEqual({ determinationId: 21, value: '' });
  });

  it('resultLabels usa nombre de paciente, con fallback #id', () => {
    const grid = buildResultGrid({ protocolIds: [9, 10], results, determinationsByResult, catalogById, analysisNameById, patientNameById: { 20002: 'Ana López' } });
    expect(grid.resultLabels[1]).toBe('Ana López');
    expect(grid.resultLabels[2]).toBe('#2');
  });

  it('sin results → sin secciones', () => {
    const grid = buildResultGrid({ protocolIds: [9], results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {}, patientNameById: {} });
    expect(grid.sections).toEqual([]);
    expect(grid.resultLabels).toEqual({});
  });
});
