import { validateFijos, fijosToMap, copyFijosFrom } from './fijos-editor.component';

describe('validateFijos', () => {
  it('fila sin analisis -> error', () => {
    expect(validateFijos([{ analysisId: null, nombre: '', monto: 100 }])).toContain('análisis');
  });
  it('monto <= 0 -> error', () => {
    expect(validateFijos([{ analysisId: 1, nombre: 'X', monto: 0 }])).toContain('mayor a 0');
  });
  it('analisis repetido -> error', () => {
    expect(validateFijos([
      { analysisId: 1, nombre: 'X', monto: 100 },
      { analysisId: 1, nombre: 'X', monto: 200 },
    ])).toContain('repetido');
  });
  it('vacio o valido -> null', () => {
    expect(validateFijos([])).toBeNull();
    expect(validateFijos([{ analysisId: 1, nombre: 'X', monto: 100 }])).toBeNull();
  });
});

describe('fijosToMap', () => {
  it('mapea validas', () => {
    expect(fijosToMap([
      { analysisId: 1, nombre: 'X', monto: 100 },
      { analysisId: 2, nombre: 'Y', monto: 50 },
    ])).toEqual({ 1: 100, 2: 50 });
  });
});

describe('copyFijosFrom', () => {
  it('devuelve una copia con el mismo contenido', () => {
    const source = [{ analysisId: 1, nombre: 'X', monto: 100 }];
    expect(copyFijosFrom(source)).toEqual(source);
  });
  it('es un deep copy: no comparte referencias de fila con el origen', () => {
    const source = [{ analysisId: 1, nombre: 'X', monto: 100 }];
    const copy = copyFijosFrom(source);
    copy[0].monto = 999;
    expect(source[0].monto).toBe(100);
  });
});
