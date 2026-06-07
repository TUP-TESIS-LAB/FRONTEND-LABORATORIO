import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TotemState } from './totem.state';

export const selectTotemState = createFeatureSelector<TotemState>('totem');

export const selectTotemSubmitting = createSelector(selectTotemState, (s) => s.submitting);

export const selectLastQueueNumber = createSelector(selectTotemState, (s) => s.lastQueueNumber);

export const selectLastHasAppointment = createSelector(selectTotemState, (s) => s.lastHasAppointment);

export const selectTotemError = createSelector(selectTotemState, (s) => s.error);
