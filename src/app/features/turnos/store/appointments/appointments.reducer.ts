import { createReducer, on } from '@ngrx/store';
import * as A from './appointments.actions';
import { initialAppointmentsState } from './appointments.state';

export const appointmentsReducer = createReducer(
  initialAppointmentsState,
  on(A.loadTodayAppointments, (s) => ({ ...s, loading: true, error: null })),
  on(A.loadTodayAppointmentsSuccess, (s, { appointments }) => ({
    ...s, todayByBranch: appointments, loading: false,
  })),
  on(A.loadTodayAppointmentsFailure, (s, { error }) => ({ ...s, loading: false, error })),
);
