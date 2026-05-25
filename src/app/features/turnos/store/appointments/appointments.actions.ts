import { createAction, props } from '@ngrx/store';
import { Appointment } from '../../models/appointment.model';

export const loadTodayAppointments = createAction(
  '[Appointments] Load Today',
  props<{ branchId: number }>()
);
export const loadTodayAppointmentsSuccess = createAction(
  '[Appointments] Load Today Success',
  props<{ appointments: Appointment[] }>()
);
export const loadTodayAppointmentsFailure = createAction(
  '[Appointments] Load Today Failure',
  props<{ error: unknown }>()
);
