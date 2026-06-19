import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Protocolo } from '../models/analitica.model';

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
