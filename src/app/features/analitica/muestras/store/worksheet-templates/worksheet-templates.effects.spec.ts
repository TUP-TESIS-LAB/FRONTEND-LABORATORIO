import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { WorksheetTemplatesEffects } from './worksheet-templates.effects';
import { WorksheetTemplatesApiService } from '../../services/worksheet-templates-api.service';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('WorksheetTemplatesEffects', () => {
  let actions$: Observable<Action>;
  let api: {
    listTemplates: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { listTemplates: vi.fn(), createTemplate: vi.fn(), updateTemplate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        WorksheetTemplatesEffects,
        provideMockActions(() => actions$),
        { provide: WorksheetTemplatesApiService, useValue: api },
      ],
    });
  });

  it('loadTemplates$ mapea success', async () => {
    api.listTemplates.mockReturnValue(of([tpl]));
    actions$ = of(loadTemplates());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.loadTemplates$);
    expect(action).toEqual(loadTemplatesSuccess({ templates: [tpl] }));
  });

  it('loadTemplates$ mapea failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.listTemplates.mockReturnValue(throwError(() => error));
    actions$ = of(loadTemplates());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.loadTemplates$);
    expect(action).toEqual(loadTemplatesFailure({ error }));
  });

  it('saveTemplate$ llama createTemplate cuando id es null', async () => {
    api.createTemplate.mockReturnValue(of(tpl));
    actions$ = of(saveTemplate({ id: null, name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(api.createTemplate).toHaveBeenCalledWith({ name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] });
    expect(api.updateTemplate).not.toHaveBeenCalled();
    expect(action).toEqual(saveTemplateSuccess());
  });

  it('saveTemplate$ llama updateTemplate cuando hay id', async () => {
    api.updateTemplate.mockReturnValue(of(tpl));
    actions$ = of(saveTemplate({ id: 1, name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(api.updateTemplate).toHaveBeenCalledWith(1, { name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] });
    expect(action).toEqual(saveTemplateSuccess());
  });

  it('saveTemplate$ mapea failure', async () => {
    const error = new HttpErrorResponse({ status: 400 });
    api.createTemplate.mockReturnValue(throwError(() => error));
    actions$ = of(saveTemplate({ id: null, name: 'X', analyses: [] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(action).toEqual(saveTemplateFailure({ error }));
  });

  it('reloadAfterSave$ emite loadTemplates tras success', async () => {
    actions$ = of(saveTemplateSuccess());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.reloadAfterSave$);
    expect(action).toEqual(loadTemplates());
  });
});
