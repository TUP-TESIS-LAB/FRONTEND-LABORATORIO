import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorksheetTemplatesState, WORKSHEET_TEMPLATES_FEATURE_KEY } from './worksheet-templates.state';

export const selectWorksheetTemplatesState =
  createFeatureSelector<WorksheetTemplatesState>(WORKSHEET_TEMPLATES_FEATURE_KEY);

export const selectTemplates = createSelector(selectWorksheetTemplatesState, s => s.templates);
export const selectTemplatesPending = createSelector(selectWorksheetTemplatesState, s => s.pending);
export const selectTemplatesSaving = createSelector(selectWorksheetTemplatesState, s => s.saving);
export const selectTemplatesError = createSelector(selectWorksheetTemplatesState, s => s.error);
