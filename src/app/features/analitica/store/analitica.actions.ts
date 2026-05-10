import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Paciente, Protocolo, Nbu } from '../models/analitica.model';

// Pacientes
export const loadPacientes = createAction('[Analitica Page] Load Pacientes');
export const loadPacientesSuccess = createAction(
  '[Analitica API] Load Pacientes Success',
  props<{ pacientes: Paciente[] }>()
);
export const loadPacientesFailure = createAction(
  '[Analitica API] Load Pacientes Failure',
  props<{ error: HttpErrorResponse }>()
);

// Protocolos
export const loadProtocolos = createAction('[Analitica Page] Load Protocolos');
export const loadProtocolosSuccess = createAction(
  '[Analitica API] Load Protocolos Success',
  props<{ protocolos: Protocolo[] }>()
);
export const loadProtocolosFailure = createAction(
  '[Analitica API] Load Protocolos Failure',
  props<{ error: HttpErrorResponse }>()
);

// Nbus
export const loadNbus = createAction('[Analitica Page] Load Nbus');
export const loadNbusSuccess = createAction(
  '[Analitica API] Load Nbus Success',
  props<{ nbus: Nbu[] }>()
);
export const loadNbusFailure = createAction(
  '[Analitica API] Load Nbus Failure',
  props<{ error: HttpErrorResponse }>()
);
