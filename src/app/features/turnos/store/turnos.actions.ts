import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { Turno } from '../models/turno.model';

export const loadTurnos = createAction(
  '[Turnos Page] Load Turnos',
  props<{ fecha: string }>()
);

export const loadTurnosSuccess = createAction(
  '[Turnos API] Load Turnos Success',
  props<{ turnos: Turno[] }>()
);

export const loadTurnosFailure = createAction(
  '[Turnos API] Load Turnos Failure',
  props<{ error: HttpErrorResponse }>()
);
