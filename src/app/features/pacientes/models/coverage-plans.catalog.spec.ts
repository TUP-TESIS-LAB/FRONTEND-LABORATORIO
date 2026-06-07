// src/app/features/pacientes/models/coverage-plans.catalog.spec.ts
import { getCoveragePlanLabel, CoveragePlanOption } from './coverage-plans.catalog';

const SAMPLE_PLANS: readonly CoveragePlanOption[] = [
  { planId: 1, label: 'Particular', particular: true },
  { planId: 2, label: 'OSDE 210', particular: false },
];

describe('getCoveragePlanLabel', () => {
  it('returns label for known planId', () => {
    expect(getCoveragePlanLabel(2, SAMPLE_PLANS)).toBe('OSDE 210');
  });
  it('returns fallback for unknown planId', () => {
    expect(getCoveragePlanLabel(999, SAMPLE_PLANS)).toBe('Plan #999');
  });
  it('returns em-dash for null/undefined', () => {
    expect(getCoveragePlanLabel(null, SAMPLE_PLANS)).toBe('—');
    expect(getCoveragePlanLabel(undefined, SAMPLE_PLANS)).toBe('—');
  });
});
