import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PATIENT_FEATURE_KEY, PatientState } from './patient.state';

export const selectPatientState = createFeatureSelector<PatientState>(PATIENT_FEATURE_KEY);

export const selectAllPatients = createSelector(selectPatientState, (s) => s.items);
export const selectPatientTotalElements = createSelector(selectPatientState, (s) => s.totalElements);
export const selectPatientTotalPages = createSelector(selectPatientState, (s) => s.totalPages);
export const selectPatientPageRequest = createSelector(selectPatientState, (s) => s.pageRequest);
export const selectSelectedPatient = createSelector(selectPatientState, (s) => s.selected);
export const selectPatientPending = createSelector(selectPatientState, (s) => s.pending);
export const selectPatientError = createSelector(selectPatientState, (s) => s.error);

/**
 * Factory selector for DNI duplicate check.
 * Returns true/false when the cached check matches the given dni, null otherwise.
 */
export const selectPatientDniCheck = (dni: string) =>
  createSelector(selectPatientState, (s) => {
    if (!s.dniCheck) return null;
    return s.dniCheck.dni === dni ? s.dniCheck.exists : null;
  });
