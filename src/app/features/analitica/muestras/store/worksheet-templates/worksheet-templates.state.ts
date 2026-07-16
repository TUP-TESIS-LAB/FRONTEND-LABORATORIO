import { HttpErrorResponse } from '@angular/common/http';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

export interface WorksheetTemplatesState {
  templates: WorksheetTemplate[];
  pending: boolean;
  saving: boolean;
  error: HttpErrorResponse | null;
}

export const initialWorksheetTemplatesState: WorksheetTemplatesState = {
  templates: [],
  pending: false,
  saving: false,
  error: null,
};

export const WORKSHEET_TEMPLATES_FEATURE_KEY = 'worksheetTemplates';
