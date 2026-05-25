import { createReducer, on } from '@ngrx/store';
import { initialTotemState } from './totem.state';
import * as A from './totem.actions';

export const totemReducer = createReducer<typeof initialTotemState>(
  initialTotemState,
  on(A.submitTotemEntry, (state) => ({
    ...state,
    submitting: true,
    error: null,
  })),
  on(A.submitTotemEntrySuccess, (state, { queueNumber, patientFirstName, patientLastName }) => ({
    ...state,
    submitting: false,
    lastQueueNumber: queueNumber,
    lastPatientFirstName: patientFirstName,
    lastPatientLastName: patientLastName,
    error: null,
  })),
  on(A.submitTotemEntryFailure, (state, { reason }) => ({
    ...state,
    submitting: false,
    error: reason,
  })),
  on(A.resetTotemView, () => initialTotemState),
);
