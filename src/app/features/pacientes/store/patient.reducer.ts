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
  verifyPatientSuccess,
} from './patient.actions';

export const patientReducer = createReducer(
  initialPatientState,

  // Intent actions: pending=true, clear error.
  // NOTA: checkPatientDni es una validación pasiva que se dispara mientras el usuario
  // tipea el DNI o cuando viene precargado por queryParam. NO debe activar `pending`
  // global — eso deshabilita el botón Registrar y parece que la pantalla está
  // congelada. Solo seteamos pending para acciones que son mutaciones reales o
  // cargas explícitas del usuario.
  on(loadPatients, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(loadPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(addPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(updatePatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(togglePatientActive, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(checkPatientDni, (state): PatientState => ({ ...state, error: null })),

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
  // Auto-verify encadenado: refleja el paciente ya verificado en el listado y
  // en el seleccionado. NO toca `pending` (el guardado ya lo limpió; el verify
  // corre en background) ni `error` (un verify fallido es silencioso).
  on(verifyPatientSuccess, (state, { patient }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === patient.id ? patient : p)),
    selected: state.selected?.id === patient.id ? patient : state.selected,
  })),

  on(togglePatientActiveSuccess, (state, { id, deleted }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === id ? { ...p, active: !deleted } : p)),
    selected: state.selected?.id === id ? { ...state.selected, active: !deleted } : state.selected,
    pending: false,
    error: null,
  })),
  on(checkPatientDniSuccess, (state, { dni, exists }): PatientState => ({
    ...state, dniCheck: { dni, exists }, error: null,
  })),

  // Failures
  on(loadPatientsFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(loadPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(addPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(updatePatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(togglePatientActiveFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(checkPatientDniFailure, (state, { error }): PatientState => ({ ...state, error })),

  // Misc UI state
  on(setPatientPageRequest, (state, { patch }): PatientState => ({
    ...state, pageRequest: { ...state.pageRequest, ...patch },
  })),
  on(clearSelectedPatient, (state): PatientState => ({ ...state, selected: null })),
);
