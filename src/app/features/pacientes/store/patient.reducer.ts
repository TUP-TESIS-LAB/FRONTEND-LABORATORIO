import { createReducer, on } from '@ngrx/store';
import { PatientState, initialPatientState } from './patient.state';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, loadPatientFailure, clearSelectedPatient,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess, updatePatientFailure,
  checkPatientDni, checkPatientDniSuccess, checkPatientDniFailure,
  togglePatientActive, togglePatientActiveSuccess, togglePatientActiveFailure,
} from './patient.actions';

export const patientReducer = createReducer(
  initialPatientState,

  // Intent actions: pending=true, clear error
  on(loadPatients, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(loadPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(addPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(updatePatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(togglePatientActive, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(checkPatientDni, (state): PatientState => ({ ...state, pending: true, error: null })),

  // Success / data updates
  on(loadPatientsSuccess, (state, { result }): PatientState => ({
    ...state,
    items: result.content,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(loadPatientSuccess, (state, { patient }): PatientState => ({
    ...state, selected: patient, pending: false, error: null,
  })),
  on(addPatientSuccess, (state, { patient }): PatientState => ({
    ...state,
    items: [...state.items, patient],
    pending: false,
    error: null,
  })),
  on(updatePatientSuccess, (state, { patient }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === patient.id ? patient : p)),
    selected: state.selected?.id === patient.id ? patient : state.selected,
    pending: false,
    error: null,
  })),
  on(togglePatientActiveSuccess, (state, { id, deleted }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === id ? { ...p, active: !deleted } : p)),
    selected: state.selected?.id === id ? { ...state.selected, active: !deleted } : state.selected,
    pending: false,
    error: null,
  })),
  on(checkPatientDniSuccess, (state, { dni, exists }): PatientState => ({
    ...state, dniCheck: { dni, exists }, pending: false, error: null,
  })),

  // Failures
  on(loadPatientsFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(loadPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(addPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(updatePatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(togglePatientActiveFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(checkPatientDniFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),

  // Misc UI state
  on(setPatientPageRequest, (state, { patch }): PatientState => ({
    ...state, pageRequest: { ...state.pageRequest, ...patch },
  })),
  on(clearSelectedPatient, (state): PatientState => ({ ...state, selected: null })),
);
