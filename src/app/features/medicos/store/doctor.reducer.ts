import { createReducer, on } from '@ngrx/store';
import { DoctorState, initialDoctorState } from './doctor.state';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctor, loadDoctorSuccess, loadDoctorFailure, clearSelectedDoctor,
  addDoctor, addDoctorSuccess, addDoctorFailure,
  updateDoctor, updateDoctorSuccess, updateDoctorFailure,
  toggleDoctorStatus, toggleDoctorStatusSuccess, toggleDoctorStatusFailure,
  deleteDoctor, deleteDoctorSuccess, deleteDoctorFailure,
} from './doctor.actions';

export const doctorReducer = createReducer(
  initialDoctorState,

  on(loadDoctors, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(loadDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(addDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(updateDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(toggleDoctorStatus, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(deleteDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),

  on(loadDoctorsSuccess, (s, { doctors }): DoctorState => ({ ...s, items: doctors, pending: false, error: null })),
  on(loadDoctorSuccess, (s, { doctor }): DoctorState => ({ ...s, selected: doctor, pending: false, error: null })),
  on(addDoctorSuccess, (s, { doctor }): DoctorState => ({ ...s, items: [...s.items, doctor], pending: false, error: null })),
  on(updateDoctorSuccess, (s, { doctor }): DoctorState => ({
    ...s,
    items: s.items.map((d) => (d.id === doctor.id ? doctor : d)),
    selected: s.selected?.id === doctor.id ? doctor : s.selected,
    pending: false, error: null,
  })),
  on(toggleDoctorStatusSuccess, (s, { doctor }): DoctorState => ({
    ...s, items: s.items.map((d) => (d.id === doctor.id ? doctor : d)), pending: false, error: null,
  })),
  on(deleteDoctorSuccess, (s, { id }): DoctorState => ({
    ...s, items: s.items.filter((d) => d.id !== id), pending: false, error: null,
  })),

  on(loadDoctorsFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(loadDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(addDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(updateDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(toggleDoctorStatusFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(deleteDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),

  on(clearSelectedDoctor, (s): DoctorState => ({ ...s, selected: null })),
);
