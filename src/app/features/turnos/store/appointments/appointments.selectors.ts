import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppointmentsState } from './appointments.state';

export const selectAppointmentsState = createFeatureSelector<AppointmentsState>('appointments');
export const selectTodayAppointments = createSelector(selectAppointmentsState, (s) => s.todayByBranch);
export const selectAppointmentsLoading = createSelector(selectAppointmentsState, (s) => s.loading);
