import { unitFormat } from './metric-format.util';

describe('unitFormat', () => {
  it('count: eje entero', () => {
    expect(unitFormat('count').integer).toBe(true);
  });

  it('count: formatea sin decimales en es-AR', () => {
    expect(unitFormat('count').format(1234)).toBe('1.234');
  });

  it('currency: no fuerza eje entero', () => {
    expect(unitFormat('currency').integer).toBe(false);
  });

  it('currency: formatea como moneda ARS', () => {
    const out = unitFormat('currency').format(1234.5);
    expect(out).toContain('$');
    expect(out).toContain('1.234');
  });

  it('percent: 1 decimal con sufijo %', () => {
    expect(unitFormat('percent').format(12.34)).toBe('12,3 %');
  });

  it('hours: 1 decimal con sufijo h', () => {
    expect(unitFormat('hours').format(2.5)).toBe('2,5 h');
  });

  it('minutes: 1 decimal con sufijo min', () => {
    expect(unitFormat('minutes').format(45)).toBe('45,0 min');
  });

  it('seconds: 1 decimal con sufijo s', () => {
    expect(unitFormat('seconds').format(30)).toBe('30,0 s');
  });

  it('decimal: 1 decimal sin sufijo', () => {
    expect(unitFormat('decimal').format(3.14)).toBe('3,1');
  });

  it('undefined cae a count (eje entero)', () => {
    expect(unitFormat(undefined).integer).toBe(true);
  });

  it('unit desconocido cae a count (eje entero)', () => {
    expect(unitFormat('algo-raro').integer).toBe(true);
  });
});
