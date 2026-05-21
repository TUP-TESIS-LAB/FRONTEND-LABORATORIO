import { QueueEntry } from '../../models/queue-entry.model';

export interface QueueState {
  entries: QueueEntry[];
  loading: boolean;
  callingId: number | null;
  error: unknown | null;
}

export const initialQueueState: QueueState = {
  entries: [],
  loading: false,
  callingId: null,
  error: null,
};
