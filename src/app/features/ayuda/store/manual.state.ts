import { HttpErrorResponse } from '@angular/common/http';
import { Manual } from '../models/manual.model';

export interface ManualState {
  manual: Manual | null;
  loading: boolean;
  error: HttpErrorResponse | null;
}

export const initialManualState: ManualState = {
  manual: null,
  loading: false,
  error: null,
};

export const MANUAL_FEATURE_KEY = 'manual';
