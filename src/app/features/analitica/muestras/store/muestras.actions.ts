import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { TransitionKey } from '../models/transition.model';

// Init: resolver sucursal del operador (GET /me/branches → primera)
export const initMuestras = createAction('[Muestras Page] Init');
export const initMuestrasSuccess = createAction(
  '[Muestras API] Init Success',
  props<{ branchId: number; branchName: string }>()
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
