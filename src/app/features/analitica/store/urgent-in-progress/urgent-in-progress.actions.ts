import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { UrgentInProgressBoard } from '../../models/urgent-in-progress.model';

// Load tablero polleable (ETag / If-None-Match) --------------------------------
export const loadUrgentInProgress        = createAction('[UrgentInProgress Dashboard] Load');
export const loadUrgentInProgressSuccess = createAction('[UrgentInProgress API] Load Success', props<{ board: UrgentInProgressBoard }>());
export const loadUrgentInProgressNotModified = createAction('[UrgentInProgress API] Load Not Modified');
export const loadUrgentInProgressFailure = createAction('[UrgentInProgress API] Load Failure', props<{ error: HttpErrorResponse }>());
