import { describe, expect, it } from 'vitest';
import { groupTubes } from './tube.model';
import type { LabelWorklistItem } from './label-worklist.model';

const item = (labelId: number, sampleId: number | null, analysisName: string, urgent = false): LabelWorklistItem => ({
  labelId, sampleId, barcode: String(labelId), protocolId: 50002, analysisName,
  patientName: 'María López', urgent, status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z',
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
});
