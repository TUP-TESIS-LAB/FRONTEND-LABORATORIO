import { createReducer, on } from '@ngrx/store';
import { initialWorksheetTemplatesState, WorksheetTemplatesState } from './worksheet-templates.state';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';

export const worksheetTemplatesReducer = createReducer(
  initialWorksheetTemplatesState,
  on(loadTemplates, (state): WorksheetTemplatesState => ({ ...state, pending: true })),
  on(loadTemplatesSuccess, (state, { templates }): WorksheetTemplatesState => ({
    ...state, templates, pending: false, error: null,
  })),
  on(loadTemplatesFailure, (state, { error }): WorksheetTemplatesState => ({ ...state, pending: false, error })),
  on(saveTemplate, (state): WorksheetTemplatesState => ({ ...state, saving: true, error: null })),
  on(saveTemplateSuccess, (state): WorksheetTemplatesState => ({ ...state, saving: false })),
  on(saveTemplateFailure, (state, { error }): WorksheetTemplatesState => ({ ...state, saving: false, error })),
);
