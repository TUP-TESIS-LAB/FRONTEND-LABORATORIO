import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DOCTOR_FEATURE_KEY, DoctorState } from './doctor.state';

export const selectDoctorState = createFeatureSelector<DoctorState>(DOCTOR_FEATURE_KEY);

export const selectAllDoctors = createSelector(selectDoctorState, (s) => s.items);
export const selectSelectedDoctor = createSelector(selectDoctorState, (s) => s.selected);
export const selectDoctorPending = createSelector(selectDoctorState, (s) => s.pending);
export const selectDoctorError = createSelector(selectDoctorState, (s) => s.error);
