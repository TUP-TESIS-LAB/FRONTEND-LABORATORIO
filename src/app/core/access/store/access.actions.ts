import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection } from '../access.model';

export const loadMySections = createAction('[Access] Load My Sections');
export const loadMySectionsSuccess = createAction(
  '[Access API] Load My Sections Success',
  props<{ sections: AccessSection[] }>(),
);
export const loadMySectionsFailure = createAction(
  '[Access API] Load My Sections Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearMySections = createAction('[Access] Clear My Sections');
