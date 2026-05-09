import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Sucursal, Area } from '../models/sucursal.model';

// Load Sucursales
export const loadSucursales = createAction(
  '[Sucursales Page] Load Sucursales'
);

export const loadSucursalesSuccess = createAction(
  '[Sucursales API] Load Sucursales Success',
  props<{ sucursales: Sucursal[] }>()
);

export const loadSucursalesFailure = createAction(
  '[Sucursales API] Load Sucursales Failure',
  props<{ error: HttpErrorResponse }>()
);

// Load Areas
export const loadAreas = createAction(
  '[Sucursales Page] Load Areas',
  props<{ sucursalId: string }>()
);

export const loadAreasSuccess = createAction(
  '[Sucursales API] Load Areas Success',
  props<{ areas: Area[] }>()
);

export const loadAreasFailure = createAction(
  '[Sucursales API] Load Areas Failure',
  props<{ error: HttpErrorResponse }>()
);
