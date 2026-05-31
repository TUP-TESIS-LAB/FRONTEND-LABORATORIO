import {
  selectAllDoctors, selectSelectedDoctor, selectDoctorPending, selectDoctorError,
} from './doctor.selectors';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from './doctor.state';

describe('doctor selectors', () => {
  const state = {
    [DOCTOR_FEATURE_KEY]: { ...initialDoctorState, items: [{ id: 1 } as never], pending: true },
  } as never;

  it('selectAllDoctors returns items', () => {
    expect(selectAllDoctors(state)).toEqual([{ id: 1 }]);
  });
  it('selectDoctorPending returns pending', () => {
    expect(selectDoctorPending(state)).toBe(true);
  });
  it('selectDoctorError returns error', () => {
    expect(selectDoctorError(state)).toBeNull();
  });
  it('selectSelectedDoctor returns null when none', () => {
    expect(selectSelectedDoctor(state)).toBeNull();
  });
});
