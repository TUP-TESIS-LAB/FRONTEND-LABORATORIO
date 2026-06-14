import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationListRow } from '../../models/postanalitica.model';

export const loadValidacionProtocolos = createAction(
  '[Validacion Protocolos Page] Load Validacion Protocolos'
);
export const loadValidacionProtocolosSuccess = createAction(
  '[Postanalitica API] Load Validacion Protocolos Success',
  props<{ rows: ValidationListRow[] }>()
);
export const loadValidacionProtocolosFailure = createAction(
  '[Postanalitica API] Load Validacion Protocolos Failure',
  props<{ error: HttpErrorResponse }>()
);
