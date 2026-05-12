// src/app/features/pacientes/models/coverage-plans.catalog.spec.ts
import { COVERAGE_PLAN_CATALOG, getCoveragePlanLabel } from './coverage-plans.catalog';

describe('getCoveragePlanLabel', () => {
  it('returns label for known planId', () => {
    expect(getCoveragePlanLabel(2)).toBe('OSDE 210');
  });
  it('returns fallback for unknown planId', () => {
    expect(getCoveragePlanLabel(999)).toBe('Plan #999');
  });
  it('returns em-dash for null/undefined', () => {
    expect(getCoveragePlanLabel(null)).toBe('—');
    expect(getCoveragePlanLabel(undefined)).toBe('—');
  });
  it('catalog is non-empty', () => {
    expect(COVERAGE_PLAN_CATALOG.length).toBeGreaterThan(0);
  });
});
