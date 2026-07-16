import { SampleTypeLabelPipe } from './sample-type-label.pipe';

describe('SampleTypeLabelPipe', () => {
  const pipe = new SampleTypeLabelPipe();

  it('traduce cada valor del enum backend a español', () => {
    expect(pipe.transform('BLOOD')).toBe('Sangre');
    expect(pipe.transform('URINE')).toBe('Orina');
    expect(pipe.transform('STOOL')).toBe('Materia fecal');
    expect(pipe.transform('SPUTUM')).toBe('Esputo');
    expect(pipe.transform('SALIVA')).toBe('Saliva');
    expect(pipe.transform('SWAB')).toBe('Hisopado');
    expect(pipe.transform('TISSUE')).toBe('Tejido');
    expect(pipe.transform('OTHER')).toBe('Otro');
  });

  it('es case-insensitive', () => {
    expect(pipe.transform('blood')).toBe('Sangre');
    expect(pipe.transform('Urine')).toBe('Orina');
  });

  it('devuelve "—" para null/undefined/vacío', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });

  it('devuelve el valor tal cual si no es un valor conocido del enum', () => {
    expect(pipe.transform('Sangre')).toBe('Sangre');
    expect(pipe.transform('PLASMA')).toBe('PLASMA');
  });
});
