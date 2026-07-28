import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { Manual } from '../models/manual.model';

// Load del manual de uso ------------------------------------------------------
export const loadManual        = createAction('[Centro de ayuda] Load Manual');
export const loadManualSuccess = createAction('[Manual API] Load Manual Success', props<{ manual: Manual }>());
export const loadManualFailure = createAction('[Manual API] Load Manual Failure', props<{ error: HttpErrorResponse }>());
