import {
  selectAllPatients,
  selectSelectedPatient,
  selectPatientPending,
  selectPatientError,
  selectPatientDniCheck,
} from './patient.selectors';
import { PATIENT_FEATURE_KEY, initialPatientState } from './patient.state';

describe('patient selectors', () => {
  const baseState = {
    [PATIENT_FEATURE_KEY]: {
      ...initialPatientState,
      items: [{ id: 1 } as never],
      dniCheck: { dni: '32456789', exists: true },
      pending: true,
      error: null,
    },
  } as never;

  it('selectAllPatients returns items', () => {
    expect(selectAllPatients(baseState)).toEqual([{ id: 1 }]);
  });

  it('selectPatientPending returns pending flag', () => {
    expect(selectPatientPending(baseState)).toBe(true);
  });

  it('selectPatientError returns error', () => {
    expect(selectPatientError(baseState)).toBeNull();
  });

  it('selectSelectedPatient returns null when no selected', () => {
    expect(selectSelectedPatient(baseState)).toBeNull();
  });

  it('selectPatientDniCheck returns true when dni matches and exists', () => {
    expect(selectPatientDniCheck('32456789')(baseState)).toBe(true);
  });

  it('selectPatientDniCheck returns null when dni does not match cached check', () => {
    expect(selectPatientDniCheck('other')(baseState)).toBeNull();
  });

  it('selectPatientDniCheck returns null when no check has run', () => {
    const s = { [PATIENT_FEATURE_KEY]: { ...initialPatientState, dniCheck: null } } as never;
    expect(selectPatientDniCheck('111')(s)).toBeNull();
  });
});
