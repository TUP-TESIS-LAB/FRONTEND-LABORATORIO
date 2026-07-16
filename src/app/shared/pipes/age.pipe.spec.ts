import { AgePipe } from './age.pipe';

describe('AgePipe', () => {
  const pipe = new AgePipe();
  const today = new Date('2026-05-12T00:00:00Z');
  it('returns full years when birthday already passed this year', () => {
    expect(pipe.transform('1991-03-15', today)).toBe(35);
  });
  it('subtracts one year when birthday has not happened yet', () => {
    expect(pipe.transform('1991-08-15', today)).toBe(34);
  });
  it('handles birthday today', () => { expect(pipe.transform('2000-05-12', today)).toBe(26); });
  it('returns null for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });
  it('returns null for invalid date', () => { expect(pipe.transform('not-a-date')).toBeNull(); });
});
