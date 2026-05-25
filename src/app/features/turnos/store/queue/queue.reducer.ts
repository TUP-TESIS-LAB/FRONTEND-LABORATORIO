import { createReducer, on } from '@ngrx/store';
import * as A from './queue.actions';
import { initialQueueState } from './queue.state';

export const queueReducer = createReducer(
  initialQueueState,
  on(A.loadQueue, (s) => ({ ...s, loading: true, error: null })),
  on(A.loadQueueSuccess, (s, { entries }) => ({ ...s, entries, loading: false })),
  on(A.loadQueueFailure, (s, { error }) => ({ ...s, loading: false, error })),

  on(A.callQueueEntry, (s, { id }) => ({ ...s, callingId: id })),
  on(A.callQueueEntrySuccess, (s) => ({ ...s, callingId: null })),
  on(A.callQueueEntryFailure, (s, { error }) => ({ ...s, callingId: null, error })),
);
