import { createAction, props } from '@ngrx/store';
import { QueueEntry } from '../../models/queue-entry.model';

export const loadQueue = createAction(
  '[Queue] Load',
  props<{ branchId: number }>()
);
export const loadQueueSuccess = createAction(
  '[Queue] Load Success',
  props<{ entries: QueueEntry[] }>()
);
export const loadQueueFailure = createAction(
  '[Queue] Load Failure',
  props<{ error: unknown }>()
);

export const callQueueEntry = createAction(
  '[Queue] Call Entry',
  props<{ id: number; branchId: number }>()
);
export const callQueueEntrySuccess = createAction(
  '[Queue] Call Entry Success',
  props<{ id: number; branchId: number }>()
);
export const callQueueEntryFailure = createAction(
  '[Queue] Call Entry Failure',
  props<{ error: unknown }>()
);
