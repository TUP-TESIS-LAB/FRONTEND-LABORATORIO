import { buildEmployeeFormSteps, EMPLOYEE_FORM_STEPS } from './employee-form-steps';

describe('buildEmployeeFormSteps', () => {
  it('returns the base steps (no firma) for a non-biochemist', () => {
    expect(buildEmployeeFormSteps(false).map((s) => s.key)).toEqual(['datos', 'usuario', 'resumen']);
  });

  it('inserts the firma step between usuario and resumen for a biochemist', () => {
    expect(buildEmployeeFormSteps(true).map((s) => s.key)).toEqual(['datos', 'usuario', 'firma', 'resumen']);
  });

  it('keeps the base constant unchanged (3 steps)', () => {
    expect(EMPLOYEE_FORM_STEPS.map((s) => s.key)).toEqual(['datos', 'usuario', 'resumen']);
  });
});
