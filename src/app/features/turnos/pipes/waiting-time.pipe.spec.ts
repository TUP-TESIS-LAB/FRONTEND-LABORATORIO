import { WaitingTimePipe } from './waiting-time.pipe';

describe('WaitingTimePipe', () => {
  const pipe = new WaitingTimePipe();
  const NOW = new Date('2026-06-03T10:00:00Z').getTime();

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve "—" si el input es null/undefined/vacio', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });

  it('devuelve "—" si el input no es un ISO valido', () => {
    expect(pipe.transform('not-a-date')).toBe('—');
  });

  it('devuelve "ahora" si elapsed < 1 min', () => {
    expect(pipe.transform('2026-06-03T09:59:30Z')).toBe('ahora');
    expect(pipe.transform('2026-06-03T10:00:00Z')).toBe('ahora');
  });

  it('devuelve "ahora" si el timestamp es del futuro (defensivo)', () => {
    expect(pipe.transform('2026-06-03T10:30:00Z')).toBe('ahora');
  });

  it('devuelve "N min" para elapsed entre 1 y 59 min', () => {
    expect(pipe.transform('2026-06-03T09:55:00Z')).toBe('5 min');
    expect(pipe.transform('2026-06-03T09:01:00Z')).toBe('59 min');
  });

  it('devuelve "N h" cuando minutos son 0', () => {
    expect(pipe.transform('2026-06-03T09:00:00Z')).toBe('1 h');
    expect(pipe.transform('2026-06-03T07:00:00Z')).toBe('3 h');
  });

  it('devuelve "N h M min" para elapsed >= 1 h con minutos > 0', () => {
    expect(pipe.transform('2026-06-03T08:40:00Z')).toBe('1 h 20 min');
    expect(pipe.transform('2026-06-03T07:35:00Z')).toBe('2 h 25 min');
  });
});
