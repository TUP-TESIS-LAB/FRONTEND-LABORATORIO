import { createFeatureSelector, createSelector } from '@ngrx/store';
import { QueueStatus } from '../../models/queue-status.enum';
import { QueueState } from './queue.state';

export const selectQueueState = createFeatureSelector<QueueState>('queue');

export const selectQueueEntriesWithAppointment = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && e.hasAppointment),
);

export const selectQueueEntriesWalkIn = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && !e.hasAppointment),
);

export const selectQueueLoading = createSelector(selectQueueState, (s) => s.loading);
export const selectQueueCallingId = createSelector(selectQueueState, (s) => s.callingId);
