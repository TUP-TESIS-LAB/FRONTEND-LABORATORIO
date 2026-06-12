import { describe, expect, it } from 'vitest';
import { toSample, BACKEND_TO_SAMPLE_STATE, type LabelWorklistItem } from './label-worklist.model';

const item: LabelWorklistItem = {
  labelId: 60005,
  barcode: '60005',
  protocolId: 50001,
  analysisName: 'Hemograma',
  patientName: 'Ana López',
  urgent: true,
  status: 'COLLECTED',
  updatedAt: '2026-06-11T10:30:00Z',
};

describe('label-worklist mapper', () => {
  it('mapea LabelWorklistItem a Sample del front', () => {
    const s = toSample(item, 'CENTRAL');
    expect(s.id).toBe('60005');
    expect(s.barcode).toBe('60005');
    expect(s.study).toBe('Hemograma');
    expect(s.patient).toBe('Ana López');
    expect(s.branch).toBe('CENTRAL');
    expect(s.urgent).toBe(true);
    expect(s.state).toBe('collected');
    expect(s.date).toMatch(/^\d{2}\/\d{2}$/);
    expect(s.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('mapea todos los estados backend visibles', () => {
    expect(BACKEND_TO_SAMPLE_STATE['IN_TRANSIT']).toBe('transito');
    expect(BACKEND_TO_SAMPLE_STATE['PROCESSING']).toBe('processing');
    expect(BACKEND_TO_SAMPLE_STATE['COMPLETED']).toBe('completed');
    expect(BACKEND_TO_SAMPLE_STATE['DERIVED']).toBe('derived');
    expect(BACKEND_TO_SAMPLE_STATE['REJECTED']).toBe('rejected');
    expect(BACKEND_TO_SAMPLE_STATE['LOST']).toBe('lost');
    expect(BACKEND_TO_SAMPLE_STATE['DISCARDED']).toBe('discarded');
  });
});
