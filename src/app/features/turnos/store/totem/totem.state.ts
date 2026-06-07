export interface TotemState {
  submitting: boolean;
  lastQueueNumber: string | null;
  lastHasAppointment: boolean;
  error: 'UNKNOWN' | null;
}

export const initialTotemState: TotemState = {
  submitting: false,
  lastQueueNumber: null,
  lastHasAppointment: false,
  error: null,
};
