import { createAction, props } from '@ngrx/store';
import { QueueEntry } from '../../models/queue-entry.model';

export const loadQueue = createAction(
  '[Queue] Load',
  // silent = true para polling: el reducer no toca `loading`, asi el p-table
  // no muestra el overlay cada 5s y la lista no parpadea.
  props<{ branchId?: number; silent?: boolean }>()
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

export const callAppointmentForAttention = createAction(
  '[Queue] Call Appointment For Attention',
  props<{ appointmentId: number; dni: string | null; queueEntryId?: number | null }>()
);
export const callAppointmentForAttentionSuccess = createAction(
  '[Queue] Call Appointment For Attention Success',
  props<{ appointmentId: number; dni: string | null; queueEntryId: number | null }>()
);
export const callAppointmentForAttentionFailure = createAction(
  '[Queue] Call Appointment For Attention Failure',
  props<{ error: unknown }>()
);

export const cancelQueueEntry = createAction(
  '[Queue] Cancel Entry',
  props<{ id: number }>()
);
export const cancelQueueEntrySuccess = createAction(
  '[Queue] Cancel Entry Success',
  props<{ id: number }>()
);
export const cancelQueueEntryFailure = createAction(
  '[Queue] Cancel Entry Failure',
  props<{ error: unknown }>()
);

// Walk-in (ST) sin appointment — Atender solo marca el entry COMPLETED y
// navega. Para CT que tienen appointmentId usamos callAppointmentForAttention.
export const attendWalkinEntry = createAction(
  '[Queue] Attend Walkin Entry',
  props<{ entryId: number; dni: string | null }>()
);
export const attendWalkinEntrySuccess = createAction(
  '[Queue] Attend Walkin Entry Success',
  props<{ dni: string | null; queueEntryId: number }>()
);
export const attendWalkinEntryFailure = createAction(
  '[Queue] Attend Walkin Entry Failure',
  props<{ error: unknown }>()
);
