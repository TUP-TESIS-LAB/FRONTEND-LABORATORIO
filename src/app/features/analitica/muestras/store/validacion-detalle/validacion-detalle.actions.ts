import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { DetalleEstudio, ValidationOutcome } from '../../models/postanalitica.model';

export const loadDetalle = createAction('[Validar Protocolo Page] Load Detalle', props<{ protocolId: number; patientName?: string; patientSex?: string | null; patientBirthDate?: string | null }>());
export const loadDetalleSuccess = createAction('[Postanalitica API] Load Detalle Success', props<{ detalle: DetalleEstudio }>());
export const loadDetalleFailure = createAction('[Postanalitica API] Load Detalle Failure', props<{ error: HttpErrorResponse }>());

export const validarTodo = createAction('[Validar Protocolo Page] Validar Todo', props<{ resultId: number; outcome: ValidationOutcome }>());
export const mutarOk = createAction('[Postanalitica API] Mutacion Ok');
export const mutarFail = createAction('[Postanalitica API] Mutacion Fail', props<{ error: HttpErrorResponse }>());

export const firmarResultado = createAction('[Validar Protocolo Page] Firmar Resultado', props<{ resultId: number }>());
export const firmarEstudio = createAction('[Validar Protocolo Page] Firmar Estudio', props<{ protocolId: number }>());
