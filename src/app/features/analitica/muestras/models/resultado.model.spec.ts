import { describe, expect, it } from 'vitest';
import { buildPlanillaGrid, buildResultGrid, pAKey } from './resultado.model';
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

describe('buildPlanillaGrid', () => {
  const result: AnalyticalResult = { id: 700, protocolId: 50014, analysisOrderId: 100, sectionId: 80012, patientId: 20002 };
  const baseInput = () => ({
    templateId: 1,
    templateName: 'prueba',
    templateAnalyses: [{ analysisTypeId: 6, displayOrder: 1, analysisName: 'Colesterol Total' }],
    determinationCatalogByAnalysis: {
      6: [{ id: 90100, name: 'Colesterol', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 }],
    } as Record<number, DeterminationCatalogEntry[]>,
    protocolIds: [50014],
    patientNameByProtocol: { 50014: 'María López' },
    resultByProtocolAnalysis: { [pAKey(50014, 6)]: result } as Record<string, AnalyticalResult | undefined>,
    determinationsByResult: {
      700: [{ id: 800, analyticalResultId: 700, determinationCatalogId: 90100, resultValue: '210', observations: null }],
    } as Record<number, Determination[]>,
  });

  // Decisión de UX: la planilla abre SIEMPRE en blanco; NO hidrata el resultValue ya
  // guardado. La celda igual debe quedar persistible (conserva resultId/determinationId)
  // para que onSave pueda pisar el AnalyticalResult compartido (last-write-wins en el back).
  it('abre la celda en blanco aunque exista un resultValue guardado, conservando los ids persistibles', () => {
    const grid = buildPlanillaGrid(baseInput());
    const cell = grid.sections[0].rows[0].cells[50014];
    expect(cell).toEqual({ resultId: 700, determinationId: 800, value: '' });
  });

  it('GAP-P5: si el protocolo no pidió el análisis, la celda no persiste y va vacía', () => {
    const input = baseInput();
    input.resultByProtocolAnalysis = {};
    const grid = buildPlanillaGrid(input);
    expect(grid.sections[0].rows[0].cells[50014]).toEqual({ resultId: null, determinationId: null, value: '' });
  });

  it('propaga analyticalType y qualitativeValues del catálogo, con default cuantitativo si faltan', () => {
    const input = baseInput();
    input.determinationCatalogByAnalysis = {
      6: [
        { id: 90100, name: 'HIV', unit: null, referenceValues: null, analysisCatalogId: 6, analyticalType: 'QUALITATIVE', qualitativeValues: ['Positivo', 'Negativo'] },
        { id: 90101, name: 'Colesterol', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 },
      ],
    } as Record<number, DeterminationCatalogEntry[]>;
    const grid = buildPlanillaGrid(input);
    const rows = grid.sections[0].rows;
    expect(rows[0].analyticalType).toBe('QUALITATIVE');
    expect(rows[0].qualitativeValues).toEqual(['Positivo', 'Negativo']);
    expect(rows[1].analyticalType).toBe('QUANTITATIVE');
    expect(rows[1].qualitativeValues).toEqual([]);
  });
});
