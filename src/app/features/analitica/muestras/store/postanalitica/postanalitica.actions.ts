import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationView, ValidationOutcome } from '../../models/postanalitica.model';

export const loadValidation = createAction('[Validacion Page] Load Validation', props<{ protocolId: number }>());
export const loadValidationSuccess = createAction('[Postanalitica API] Load Validation Success', props<{ view: ValidationView }>());
export const loadValidationFailure = createAction('[Postanalitica API] Load Validation Failure', props<{ error: HttpErrorResponse }>());

export const validateDet = createAction('[Validacion Page] Validate Det', props<{ resultId: number; determinationId: number; outcome: ValidationOutcome }>());
export const validateDetSuccess = createAction('[Postanalitica API] Validate Det Success');
export const validateDetFailure = createAction('[Postanalitica API] Validate Det Failure', props<{ error: HttpErrorResponse }>());

export const validateAll = createAction('[Validacion Page] Validate All', props<{ resultId: number; outcome: ValidationOutcome }>());
export const validateAllSuccess = createAction('[Postanalitica API] Validate All Success');
export const validateAllFailure = createAction('[Postanalitica API] Validate All Failure', props<{ error: HttpErrorResponse }>());
