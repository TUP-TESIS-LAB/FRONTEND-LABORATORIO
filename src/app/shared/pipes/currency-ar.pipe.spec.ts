import { CurrencyArPipe } from './currency-ar.pipe';

describe('CurrencyArPipe', () => {
  const pipe = new CurrencyArPipe();

  it('formats number as ARS', () => {
    const result = pipe.transform(1500);
    expect(result).toContain('1.500,00');
    expect(result).toContain('$');
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
