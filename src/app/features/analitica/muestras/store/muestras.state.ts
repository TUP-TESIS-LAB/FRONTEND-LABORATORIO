import { HttpErrorResponse } from '@angular/common/http';
import type { BranchOption } from '@features/analitica/models/extraction.model';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

export interface MuestrasState {
  branchId: number | null;
  branchName: string;
  /** Todas las sucursales del operador (destinos posibles de derivación). */
  branches: BranchOption[];
  recoleccion: LabelWorklistItem[];
  pending: boolean;
  transitionPending: boolean;
  error: HttpErrorResponse | null;
  transito: LabelWorklistItem[];
  routing: RoutingResolveResponse | null;
  workspaces: BranchWorkspace[];
  dispatchPending: boolean;
  descarte: LabelWorklistItem[];
  procesamiento: LabelWorklistItem[];
}

export const initialMuestrasState: MuestrasState = {
  branchId: null,
  branchName: '',
  branches: [],
  recoleccion: [],
  pending: false,
  transitionPending: false,
  error: null,
  transito: [],
  routing: null,
  workspaces: [],
  dispatchPending: false,
  descarte: [],
  procesamiento: [],
};

export const MUESTRAS_FEATURE_KEY = 'muestras';
