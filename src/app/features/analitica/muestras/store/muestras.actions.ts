import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { BranchOption } from '@features/analitica/models/extraction.model';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { TransitionKey } from '../models/transition.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

// Init: resolver sucursal del operador (GET /me/branches → primera). `branches` = lista completa
// (destinos posibles de derivación en Tránsito).
export const initMuestras = createAction('[Muestras Page] Init');
export const initMuestrasSuccess = createAction(
  '[Muestras API] Init Success',
  props<{ branchId: number; branchName: string; branches: BranchOption[] }>()
);
export const initMuestrasFailure = createAction(
  '[Muestras API] Init Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist Recolección (COLLECTED) — polleada
export const loadRecoleccion = createAction('[Muestras Page] Load Recoleccion');
export const loadRecoleccionSuccess = createAction(
  '[Muestras API] Load Recoleccion Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadRecoleccionNotModified = createAction('[Muestras API] Load Recoleccion Not Modified');
export const loadRecoleccionFailure = createAction(
  '[Muestras API] Load Recoleccion Failure',
  props<{ error: HttpErrorResponse }>()
);

// Transiciones (pessimistic: success → recarga)
export const transitionLabels = createAction(
  '[Muestras Page] Transition Labels',
  props<{ labelIds: number[]; transitionKey: TransitionKey; reason?: string }>()
);
export const transitionLabelsSuccess = createAction(
  '[Muestras API] Transition Labels Success',
  props<{ labelIds: number[]; transitionKey: TransitionKey }>()
);
export const transitionLabelsFailure = createAction(
  '[Muestras API] Transition Labels Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist Tránsito (IN_TRANSIT) — polleada
export const loadTransito = createAction('[Muestras Page] Load Transito');
export const loadTransitoSuccess = createAction(
  '[Muestras API] Load Transito Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadTransitoNotModified = createAction('[Muestras API] Load Transito Not Modified');
export const loadTransitoFailure = createAction(
  '[Muestras API] Load Transito Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist "A descartar" (COMPLETED) — polleada; permite descarte físico
export const loadDescarte = createAction('[Muestras Page] Load Descarte');
export const loadDescarteSuccess = createAction(
  '[Muestras API] Load Descarte Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadDescarteNotModified = createAction('[Muestras API] Load Descarte Not Modified');
export const loadDescarteFailure = createAction(
  '[Muestras API] Load Descarte Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist "Rechazadas/Perdidas" (REJECTED,LOST) — polleada; permite re-inyección por-fila
export const loadRechazadas = createAction('[Muestras Page] Load Rechazadas');
export const loadRechazadasSuccess = createAction(
  '[Muestras API] Load Rechazadas Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadRechazadasNotModified = createAction('[Muestras API] Load Rechazadas Not Modified');
export const loadRechazadasFailure = createAction(
  '[Muestras API] Load Rechazadas Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist "Descartadas" (DISCARDED) — polleada, solo lectura (historial)
export const loadDescartadas = createAction('[Muestras Page] Load Descartadas');
export const loadDescartadasSuccess = createAction(
  '[Muestras API] Load Descartadas Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadDescartadasNotModified = createAction('[Muestras API] Load Descartadas Not Modified');
export const loadDescartadasFailure = createAction(
  '[Muestras API] Load Descartadas Failure',
  props<{ error: HttpErrorResponse }>()
);

// Worklist Procesamiento (PROCESSING) y Derivados (DERIVED) — polleada, solo lectura (Arco 1).
// El `status` viaja de punta a punta (action → effect → reducer) para rutear a slices separados
// (procesamiento vs derivados) y que el tab y la lista nunca se desalineen.
export const loadProcesamiento = createAction(
  '[Muestras Page] Load Procesamiento',
  props<{ status: 'PROCESSING' | 'DERIVED' }>(),
);
export const loadProcesamientoSuccess = createAction(
  '[Muestras API] Load Procesamiento Success',
  props<{ status: 'PROCESSING' | 'DERIVED'; items: LabelWorklistItem[] }>()
);
export const loadProcesamientoNotModified = createAction(
  '[Muestras API] Load Procesamiento Not Modified',
  props<{ status: 'PROCESSING' | 'DERIVED' }>()
);
export const loadProcesamientoFailure = createAction(
  '[Muestras API] Load Procesamiento Failure',
  props<{ error: HttpErrorResponse }>()
);

// Resolve Routing
export const resolveRouting = createAction('[Transito Page] Resolve Routing');
export const resolveRoutingSuccess = createAction(
  '[Muestras API] Resolve Routing Success',
  props<{ routing: RoutingResolveResponse }>()
);
export const resolveRoutingFailure = createAction(
  '[Muestras API] Resolve Routing Failure',
  props<{ error: HttpErrorResponse }>()
);

// Workspaces de sucursal
export const loadWorkspaces = createAction('[Transito Page] Load Workspaces');
export const loadWorkspacesSuccess = createAction(
  '[Muestras API] Load Workspaces Success',
  props<{ workspaces: BranchWorkspace[] }>()
);
export const loadWorkspacesFailure = createAction(
  '[Muestras API] Load Workspaces Failure',
  props<{ error: HttpErrorResponse }>()
);

// Despacho (tubo → PROCESSING + check-in)
export const dispatchTubes = createAction(
  '[Transito Page] Dispatch Tubes',
  props<{ checkIns: { sampleId: number; sectionId: number }[] }>()
);
export const dispatchTubesSuccess = createAction(
  '[Muestras API] Dispatch Tubes Success',
  props<{ count: number }>()
);
export const dispatchTubesFailure = createAction(
  '[Muestras API] Dispatch Tubes Failure',
  props<{ error: HttpErrorResponse }>()
);

// Derivación (labels → otra sucursal, quedan IN_TRANSIT)
export const deriveTubes = createAction(
  '[Transito Page] Derive Tubes',
  props<{ labelIds: number[]; destinationBranchId: number; tubeCount: number; observation?: string }>()
);
export const deriveTubesSuccess = createAction(
  '[Muestras API] Derive Tubes Success',
  props<{ count: number }>()
);
export const deriveTubesFailure = createAction(
  '[Muestras API] Derive Tubes Failure',
  props<{ error: HttpErrorResponse }>()
);

// Derivación real a laboratorio externo (label → DERIVED con externalLabId)
export const deriveToExternalLab = createAction(
  '[Muestras Page] Derive To External Lab',
  props<{ labelIds: number[]; externalLabId: number; protocolId?: number }>()
);
export const deriveToExternalLabSuccess = createAction(
  '[Muestras API] Derive To External Lab Success',
  props<{ labelIds: number[] }>()
);
export const deriveToExternalLabFailure = createAction(
  '[Muestras API] Derive To External Lab Failure',
  props<{ error: HttpErrorResponse }>()
);
