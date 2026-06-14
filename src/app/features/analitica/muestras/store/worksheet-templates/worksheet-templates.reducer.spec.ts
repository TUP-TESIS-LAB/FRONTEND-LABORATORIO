import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { worksheetTemplatesReducer } from './worksheet-templates.reducer';
import { initialWorksheetTemplatesState } from './worksheet-templates.state';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';
import { selectTemplates, selectTemplatesPending, selectTemplatesSaving, selectTemplatesError } from './worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('worksheetTemplatesReducer', () => {
  it('loadTemplates pone pending=true', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, loadTemplates());
    expect(s.pending).toBe(true);
  });

  it('loadTemplatesSuccess puebla templates y baja pending', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, loadTemplatesSuccess({ templates: [tpl] }));
    expect(s.templates).toEqual([tpl]);
    expect(s.pending).toBe(false);
    expect(s.error).toBeNull();
  });

  it('loadTemplatesFailure setea error y baja pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, pending: true }, loadTemplatesFailure({ error }));
    expect(s.pending).toBe(false);
    expect(s.error).toBe(error);
  });

  it('saveTemplate pone saving=true', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, saveTemplate({ id: null, name: 'X', analyses: [] }));
    expect(s.saving).toBe(true);
    expect(s.error).toBeNull();
  });

  it('saveTemplateSuccess baja saving', () => {
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, saving: true }, saveTemplateSuccess());
    expect(s.saving).toBe(false);
  });

  it('saveTemplateFailure baja saving y setea error', () => {
    const error = new HttpErrorResponse({ status: 400 });
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, saving: true }, saveTemplateFailure({ error }));
    expect(s.saving).toBe(false);
    expect(s.error).toBe(error);
  });

  it('selectores proyectan su slice', () => {
    const state = { ...initialWorksheetTemplatesState, templates: [tpl], pending: true, saving: true };
    expect(selectTemplates.projector(state)).toEqual([tpl]);
    expect(selectTemplatesPending.projector(state)).toBe(true);
    expect(selectTemplatesSaving.projector(state)).toBe(true);
    expect(selectTemplatesError.projector(state)).toBeNull();
  });
});
