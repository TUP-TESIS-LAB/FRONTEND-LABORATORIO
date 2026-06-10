import { isSameLocalDay } from './same-local-day';

describe('isSameLocalDay', () => {
  const now = new Date(2026, 5, 10, 14, 0, 0); // 10-jun-2026 14:00 local

  it('true para el mismo día local (distinta hora)', () => {
    expect(isSameLocalDay('2026-06-10T08:30:00', now)).toBe(true);
    expect(isSameLocalDay('2026-06-10T23:59:00', now)).toBe(true);
  });

  it('false para días distintos', () => {
    expect(isSameLocalDay('2026-06-09T23:59:00', now)).toBe(false);
    expect(isSameLocalDay('2026-06-11T00:01:00', now)).toBe(false);
    expect(isSameLocalDay('2025-06-10T14:00:00', now)).toBe(false);
  });

  it('false para fecha nula, vacía o no parseable', () => {
    expect(isSameLocalDay(null, now)).toBe(false);
    expect(isSameLocalDay(undefined, now)).toBe(false);
    expect(isSameLocalDay('', now)).toBe(false);
    expect(isSameLocalDay('no-es-fecha', now)).toBe(false);
  });
});
