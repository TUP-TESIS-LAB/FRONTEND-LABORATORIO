import { HttpErrorResponse } from '@angular/common/http';
import { AttentionResponse } from '../../models/atencion.model';

export interface UrgentPendingState {
  items: AttentionResponse[];
  etag: string | null;
  loading: boolean;
  error: HttpErrorResponse | null;
  resolving: boolean;
  resolveError: HttpErrorResponse | null;
}

export const initialUrgentPendingState: UrgentPendingState = {
  items: [],
  etag: null,
  loading: false,
  error: null,
  resolving: false,
  resolveError: null,
};

export const URGENT_PENDING_FEATURE_KEY = 'urgentPending';
