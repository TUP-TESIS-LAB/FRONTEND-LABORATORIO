import { DateEsPipe } from './date-es.pipe';

describe('DateEsPipe', () => {
  const pipe = new DateEsPipe();
  const iso = '2026-06-19T14:30:00'; // hora local, no UTC

  it('formatea solo fecha por default (dd/mm/yyyy)', () => {
    expect(pipe.transform(iso)).toBe('19/06/2026');
  });

  it("modo 'time' devuelve HH:mm 24h", () => {
    expect(pipe.transform(iso, 'time')).toBe('14:30');
  });

  it("modo 'datetime' devuelve dd/mm/yyyy HH:mm", () => {
    expect(pipe.transform(iso, 'datetime')).toBe('19/06/2026 14:30');
  });

  it('acepta un objeto Date', () => {
    expect(pipe.transform(new Date(2026, 5, 7, 9, 5))).toBe('07/06/2026');
  });

  it('devuelve "" para null/undefined/valor inválido', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('no-es-fecha')).toBe('');
  });
});
