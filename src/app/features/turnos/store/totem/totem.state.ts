export interface TotemState {
  submitting: boolean;
  lastQueueNumber: string | null;
  lastPatientFirstName: string | null;
  lastPatientLastName: string | null;
  error: 'PATIENT_NOT_FOUND' | 'UNKNOWN' | null;
}

export const initialTotemState: TotemState = {
  submitting: false,
  lastQueueNumber: null,
  lastPatientFirstName: null,
  lastPatientLastName: null,
  error: null,
};
