import { HttpErrorResponse } from '@angular/common/http';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

export interface MuestrasState {
  branchId: number | null;
  branchName: string;
  recoleccion: LabelWorklistItem[];
  pending: boolean;
  transitionPending: boolean;
  error: HttpErrorResponse | null;
  transito: LabelWorklistItem[];
  routing: RoutingResolveResponse | null;
  workspaces: BranchWorkspace[];
  dispatchPending: boolean;
}

export const initialMuestrasState: MuestrasState = {
  branchId: null,
  branchName: '',
  recoleccion: [],
  pending: false,
  transitionPending: false,
  error: null,
  transito: [],
  routing: null,
  workspaces: [],
  dispatchPending: false,
};

export const MUESTRAS_FEATURE_KEY = 'muestras';
