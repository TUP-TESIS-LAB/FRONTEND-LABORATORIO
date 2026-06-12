import { HttpErrorResponse } from '@angular/common/http';
import type { LabelWorklistItem } from '../models/label-worklist.model';

export interface MuestrasState {
  branchId: number | null;
  branchName: string;
  recoleccion: LabelWorklistItem[];
  pending: boolean;
  transitionPending: boolean;
  error: HttpErrorResponse | null;
}

export const initialMuestrasState: MuestrasState = {
  branchId: null,
  branchName: '',
  recoleccion: [],
  pending: false,
  transitionPending: false,
  error: null,
};

export const MUESTRAS_FEATURE_KEY = 'muestras';
