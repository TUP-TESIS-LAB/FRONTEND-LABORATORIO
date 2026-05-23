import { describe, it, expect } from 'vitest';
import { PATIENT_FORM_STEPS, PatientFormStepKey } from './patient-form-steps';

describe('PATIENT_FORM_STEPS', () => {
  it('exposes exactly 3 steps in display order', () => {
    expect(PATIENT_FORM_STEPS.map((s) => s.key)).toEqual<PatientFormStepKey[]>([
      'general', 'coverages', 'contact-address',
    ]);
  });

  it('marks only the first step as required', () => {
    expect(PATIENT_FORM_STEPS[0].required).toBe(true);
    expect(PATIENT_FORM_STEPS[1].required).toBe(false);
    expect(PATIENT_FORM_STEPS[2].required).toBe(false);
  });

  it('every step has title and subtitle copy', () => {
    for (const step of PATIENT_FORM_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.subtitle.length).toBeGreaterThan(0);
    }
  });
});
