import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TotemState } from './totem.state';

export const selectTotemState = createFeatureSelector<TotemState>('totem');

export const selectTotemSubmitting = createSelector(
  selectTotemState,
  (s) => s.submitting,
);

export const selectLastQueueNumber = createSelector(
  selectTotemState,
  (s) => s.lastQueueNumber,
);

export const selectLastPatientName = createSelector(
  selectTotemState,
  (s) => s.lastPatientFirstName && s.lastPatientLastName
    ? `${s.lastPatientFirstName} ${s.lastPatientLastName}`
    : null,
);

export const selectTotemError = createSelector(
  selectTotemState,
  (s) => s.error,
);
