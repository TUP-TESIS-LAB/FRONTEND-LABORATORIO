import { HttpErrorResponse } from '@angular/common/http';
import { UrgentInProgressBoard } from '../../models/urgent-in-progress.model';

export interface UrgentInProgressState {
  board: UrgentInProgressBoard | null;
  loading: boolean;
  error: HttpErrorResponse | null;
}

export const initialUrgentInProgressState: UrgentInProgressState = {
  board: null,
  loading: false,
  error: null,
};

export const URGENT_IN_PROGRESS_FEATURE_KEY = 'urgentInProgress';
