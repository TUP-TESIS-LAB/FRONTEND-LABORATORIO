import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';

import { SectionListItem } from '../../models/section-list-item.model';

// --- Load secciones (listado enriquecido con branches) ----------------------
export const loadSecciones = createAction('[Empresa Secciones Page] Load Secciones');
export const loadSeccionesSuccess = createAction(
  '[Empresa API] Load Secciones Success',
  props<{ items: SectionListItem[] }>(),
);
export const loadSeccionesFailure = createAction(
  '[Empresa API] Load Secciones Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Load count por sección (analitica) -------------------------------------
export const loadCountBySection = createAction('[Empresa Secciones Page] Load Count By Section');
export const loadCountBySectionSuccess = createAction(
  '[Empresa API] Load Count By Section Success',
  props<{ countMap: Record<number, number> }>(),
);
export const loadCountBySectionFailure = createAction(
  '[Empresa API] Load Count By Section Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Load análisis sin sección ----------------------------------------------
export const loadUnassignedCount = createAction('[Empresa Secciones Page] Load Unassigned Count');
export const loadUnassignedCountSuccess = createAction(
  '[Empresa API] Load Unassigned Count Success',
  props<{ count: number }>(),
);
export const loadUnassignedCountFailure = createAction(
  '[Empresa API] Load Unassigned Count Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Crear sección (+ asignar análisis) -------------------------------------
export const addSeccion = createAction(
  '[Empresa Secciones Page] Add Seccion',
  props<{ name: string; analysisIds: number[] }>(),
);
export const addSeccionSuccess = createAction('[Empresa API] Add Seccion Success');
export const addSeccionFailure = createAction(
  '[Empresa API] Add Seccion Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Editar sección (nombre + análisis) -------------------------------------
export const updateSeccion = createAction(
  '[Empresa Secciones Page] Update Seccion',
  props<{ id: number; name: string; analysisIds: number[] }>(),
);
export const updateSeccionSuccess = createAction('[Empresa API] Update Seccion Success');
export const updateSeccionFailure = createAction(
  '[Empresa API] Update Seccion Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Borrar sección ---------------------------------------------------------
export const deleteSeccion = createAction(
  '[Empresa Secciones Page] Delete Seccion',
  props<{ id: number }>(),
);
export const deleteSeccionSuccess = createAction(
  '[Empresa API] Delete Seccion Success',
  props<{ id: number }>(),
);
export const deleteSeccionFailure = createAction(
  '[Empresa API] Delete Seccion Failure',
  props<{ error: HttpErrorResponse }>(),
);
