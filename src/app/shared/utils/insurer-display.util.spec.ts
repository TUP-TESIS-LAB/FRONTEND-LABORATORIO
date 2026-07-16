import { insurerDisplayLabel } from './insurer-display.util';

describe('insurerDisplayLabel', () => {
  it('combina sigla y nombre', () => {
    expect(insurerDisplayLabel({ name: 'PAMI', acronym: 'PAMI' })).toBe('PAMI — PAMI');
    expect(insurerDisplayLabel({ name: 'Instituto de Obra Médico Asistencial', acronym: 'IOMA' }))
      .toBe('IOMA — Instituto de Obra Médico Asistencial');
  });

  it('degrada a solo el nombre si no hay sigla', () => {
    expect(insurerDisplayLabel({ name: 'Swiss Medical', acronym: null })).toBe('Swiss Medical');
    expect(insurerDisplayLabel({ name: 'Swiss Medical', acronym: undefined })).toBe('Swiss Medical');
    expect(insurerDisplayLabel({ name: 'Swiss Medical', acronym: '' })).toBe('Swiss Medical');
    expect(insurerDisplayLabel({ name: 'Swiss Medical', acronym: '   ' })).toBe('Swiss Medical');
  });
});
