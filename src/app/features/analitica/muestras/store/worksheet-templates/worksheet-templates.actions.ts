import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { WorksheetTemplate, WorksheetTemplateAnalysis } from '../../models/worksheet-template.model';

export const loadTemplates = createAction('[Planillas Page] Load Templates');
export const loadTemplatesSuccess = createAction(
  '[Worksheet Templates API] Load Templates Success',
  props<{ templates: WorksheetTemplate[] }>()
);
export const loadTemplatesFailure = createAction(
  '[Worksheet Templates API] Load Templates Failure',
  props<{ error: HttpErrorResponse }>()
);

/** id null = create; id presente = update. */
export const saveTemplate = createAction(
  '[Planillas Modal] Save Template',
  props<{ id: number | null; name: string; analyses: WorksheetTemplateAnalysis[] }>()
);
export const saveTemplateSuccess = createAction('[Worksheet Templates API] Save Template Success');
export const saveTemplateFailure = createAction(
  '[Worksheet Templates API] Save Template Failure',
  props<{ error: HttpErrorResponse }>()
);

export const deleteTemplate = createAction(
  '[Planillas Modal] Delete Template',
  props<{ id: number }>()
);
export const deleteTemplateSuccess = createAction('[Worksheet Templates API] Delete Template Success');
export const deleteTemplateFailure = createAction(
  '[Worksheet Templates API] Delete Template Failure',
  props<{ error: HttpErrorResponse }>()
);
