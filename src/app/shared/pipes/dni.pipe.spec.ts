import { DniPipe } from './dni.pipe';

describe('DniPipe', () => {
  const pipe = new DniPipe();
  it('formats 8 digits as ##.###.###', () => { expect(pipe.transform('32456789')).toBe('32.456.789'); });
  it('formats 7 digits as #.###.###', () => { expect(pipe.transform('1234567')).toBe('1.234.567'); });
  it('strips non-digits before formatting', () => {
    expect(pipe.transform('32.456.789')).toBe('32.456.789');
    expect(pipe.transform('32-456-789')).toBe('32.456.789');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
  it('returns raw input when length < 7', () => { expect(pipe.transform('123')).toBe('123'); });
});
