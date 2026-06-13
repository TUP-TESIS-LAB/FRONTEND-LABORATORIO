import { describe, expect, it } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PlanillasModalComponent } from './planillas-modal.component';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 5, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }, { analysisTypeId: 11, displayOrder: 1 }],
  active: true, version: 1,
};

function setup(templates: WorksheetTemplate[] = []): ComponentFixture<PlanillasModalComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PlanillasModalComponent],
    providers: [
      provideNoopAnimations(),
      provideMockStore({ selectors: [
        { selector: selectTemplates, value: templates },
        { selector: selectTemplatesPending, value: false },
      ] }),
    ],
  });
  const fx = TestBed.createComponent(PlanillasModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.detectChanges();
  return fx;
}

describe('PlanillasModalComponent', () => {
  it('expone las plantillas del store y su conteo de análisis', () => {
    const fx = setup([tpl]);
    expect(fx.componentInstance.templates().length).toBe(1);
    expect(fx.componentInstance.analysisCount(tpl)).toBe(2);
  });

  it('newSheet emite el output', () => {
    const fx = setup([tpl]);
    let emitted = false;
    fx.componentInstance.newSheet.subscribe(() => (emitted = true));
    fx.componentInstance.onNewSheet();
    expect(emitted).toBe(true);
  });

  it('editSheet emite el id', () => {
    const fx = setup([tpl]);
    let id: number | undefined;
    fx.componentInstance.editSheet.subscribe(v => (id = v));
    fx.componentInstance.onEdit(5);
    expect(id).toBe(5);
  });
});
