import { describe, expect, it } from 'vitest';
import { groupTubes } from './tube.model';
import type { LabelWorklistItem } from './label-worklist.model';

const item = (
  labelId: number, sampleId: number | null, analysisName: string, urgent = false,
  cargaStatus?: LabelWorklistItem['cargaStatus'],
): LabelWorklistItem => ({
  labelId, sampleId, barcode: String(labelId), protocolId: 50002, analysisTypeId: labelId, analysisName,
  patientName: 'María López', urgent, status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z', cargaStatus,
});

describe('groupTubes', () => {
  it('agrupa labels del mismo sample en un tubo', () => {
    const tubes = groupTubes([item(60006, 50003, 'Colesterol'), item(60028, 50003, 'TGO')], 'Sede Central');
    expect(tubes).toHaveLength(1);
    expect(tubes[0].labelIds).toEqual([60006, 60028]);
    expect(tubes[0].analyses.map(a => a.name)).toEqual(['Colesterol', 'TGO']);
  });

  it('label sin sampleId queda como tubo individual', () => {
    const tubes = groupTubes([item(60006, 50003, 'Colesterol'), item(60099, null, 'Huérfano')], 'Sede Central');
    expect(tubes).toHaveLength(2);
  });

  it('el tubo es urgente si cualquiera de sus labels lo es', () => {
    const tubes = groupTubes([item(60006, 50003, 'A'), item(60028, 50003, 'B', true)], 'Sede Central');
    expect(tubes[0].urgent).toBe(true);
  });

  it('groupTubes propaga protocolId del primer label', () => {
    const items = [
      { labelId: 1, sampleId: 50, barcode: 'b1', protocolId: 77, analysisTypeId: 1, analysisName: 'A', patientName: 'P', urgent: false, status: 'PROCESSING' as const, updatedAt: '2026-06-13T08:00:00Z' },
    ];
    const tubes = groupTubes(items, 'CENTRAL');
    expect(tubes[0].protocolId).toBe(77);
  });

  it('groupTubes produce receivedAt ISO y NO produce date ni time', () => {
    const items = [
      { labelId: 1, sampleId: 50, barcode: 'b1', protocolId: 77, analysisName: 'A', patientName: 'P', urgent: false, status: 'COLLECTED' as const, updatedAt: '2026-06-12T10:30:00Z' },
    ];
    const tubes = groupTubes(items as any, 'CENTRAL');
    expect(tubes[0].receivedAt).toBe('2026-06-12T10:30:00Z');
    expect((tubes[0] as unknown as Record<string, unknown>)['date']).toBeUndefined();
    expect((tubes[0] as unknown as Record<string, unknown>)['time']).toBeUndefined();
  });

  it('cargaStatus del tubo es COMPLETA si todas las labels son COMPLETA', () => {
    const tubes = groupTubes([item(1, 50, 'A', false, 'COMPLETA'), item(2, 50, 'B', false, 'COMPLETA')], 'CENTRAL');
    expect(tubes[0].cargaStatus).toBe('COMPLETA');
  });

  // SIN se eliminó: solo quedan PARCIAL y COMPLETA. Cualquier label no-COMPLETA agrega a PARCIAL.
  it('cargaStatus del tubo es PARCIAL ante cualquier mezcla con PARCIAL', () => {
    const tubes = groupTubes([item(1, 50, 'A', false, 'COMPLETA'), item(2, 50, 'B', false, 'PARCIAL')], 'CENTRAL');
    expect(tubes[0].cargaStatus).toBe('PARCIAL');
  });

  it('cargaStatus del tubo es PARCIAL si alguna label es PARCIAL', () => {
    const tubes = groupTubes([item(1, 50, 'A', false, 'COMPLETA'), item(2, 50, 'B', false, 'PARCIAL')], 'CENTRAL');
    expect(tubes[0].cargaStatus).toBe('PARCIAL');
  });

  it('cargaStatus es undefined (degradado) si alguna label no lo trae', () => {
    const tubes = groupTubes([item(1, 50, 'A', false, 'COMPLETA'), item(2, 50, 'B')], 'CENTRAL');
    expect(tubes[0].cargaStatus).toBeUndefined();
  });

  it('propaga el destino pre-calculado (sectionId/destinationBranchId) del worklist', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 1, sampleId: 50, barcode: 'b1', protocolId: 77, analysisTypeId: 1, analysisName: 'A',
        patientName: 'P', urgent: false, status: 'IN_TRANSIT', updatedAt: '2026-06-24T10:00:00Z',
        sectionId: 80005, destinationBranchId: 1002 },
    ];
    const tubes = groupTubes(items, 'CENTRAL');
    expect(tubes[0].sectionId).toBe(80005);
    expect(tubes[0].destinationBranchId).toBe(1002);
  });

  it('destino local: sectionId presente, destinationBranchId null', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 1, sampleId: 50, barcode: 'b1', protocolId: 77, analysisTypeId: 1, analysisName: 'A',
        patientName: 'P', urgent: false, status: 'IN_TRANSIT', updatedAt: '2026-06-24T10:00:00Z',
        sectionId: 80002, destinationBranchId: null },
    ];
    const tubes = groupTubes(items, 'CENTRAL');
    expect(tubes[0].sectionId).toBe(80002);
    expect(tubes[0].destinationBranchId).toBeNull();
  });
});
