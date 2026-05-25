import { Appointment } from '../../models/appointment.model';

export interface AppointmentsState {
  todayByBranch: Appointment[];
  loading: boolean;
  error: unknown | null;
}

export const initialAppointmentsState: AppointmentsState = {
  todayByBranch: [],
  loading: false,
  error: null,
};
