import { beforeEach, describe, expect, it } from 'vitest';
import {
  AnalisisDraft, clearAnalisisDraft, readAnalisisDraft, writeAnalisisDraft,
} from './analisis-draft-store';

const sample: AnalisisDraft = {
  isUrgent: true,
  rows: [
    { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true },
    { id: 9, shortCode: '2001', name: 'Glucemia', familyName: 'Química', ubCount: 5, isAuthorized: false },
  ],
};

describe('analisis-draft-store', () => {
  beforeEach(() => localStorage.clear());

  it('write + read roundtrip por attentionId', () => {
    writeAnalisisDraft(42, sample);
    expect(readAnalisisDraft(42)).toEqual(sample);
  });

  it('aísla por attentionId (no cruza borradores)', () => {
    writeAnalisisDraft(42, sample);
    expect(readAnalisisDraft(99)).toBeNull();
  });

  it('read devuelve null si no hay borrador', () => {
    expect(readAnalisisDraft(7)).toBeNull();
  });

  it('clear elimina el borrador', () => {
    writeAnalisisDraft(42, sample);
    clearAnalisisDraft(42);
    expect(readAnalisisDraft(42)).toBeNull();
  });

  it('ignora attentionId inválido (<= 0)', () => {
    writeAnalisisDraft(0, sample);
    expect(readAnalisisDraft(0)).toBeNull();
  });

  it('read tolera JSON corrupto', () => {
    localStorage.setItem('atencion:analisis-draft:42', '{no es json');
    expect(readAnalisisDraft(42)).toBeNull();
  });
});
