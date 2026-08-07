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
  /**
   * Error del resolve de routing, separado de `error`. Resolve corre solo (automático, tras
   * cargar tránsito) — no lo disparó el operador, así que no puede compartir el pipe de toast
   * rojo de `error` (transito.page.ts trata este campo distinto, con severidad 'warn').
   */
  routingError: HttpErrorResponse | null;
  workspaces: BranchWorkspace[];
  dispatchPending: boolean;
  /** "A descartar": tubos COMPLETED listos para descarte físico. */
  descarte: LabelWorklistItem[];
  /** "Descartadas": tubos ya en DISCARDED (historial, solo lectura). */
  descartadas: LabelWorklistItem[];
  /** "Rechazadas/Perdidas": labels REJECTED/LOST, candidatas a re-inyección. */
  rechazadas: LabelWorklistItem[];
  /** Tab "Todos" de Procesamiento: tubos en PROCESSING. */
  procesamiento: LabelWorklistItem[];
  /** Tab "Derivados" de Procesamiento: tubos en DERIVED. Slice separado para que el tab y la
   *  lista nunca se desalineen (PROCESSING/DERIVED ya no comparten campo). */
  derivados: LabelWorklistItem[];
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
  routingError: null,
  workspaces: [],
  dispatchPending: false,
  descarte: [],
  descartadas: [],
  rechazadas: [],
  procesamiento: [],
  derivados: [],
};

export const MUESTRAS_FEATURE_KEY = 'muestras';
