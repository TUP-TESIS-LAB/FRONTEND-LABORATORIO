import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PlanillasModalComponent } from './planillas-modal.component';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { deleteTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 5, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }, { analysisTypeId: 11, displayOrder: 1 }],
  active: true, version: 1,
};
const ev = () => new Event('click');

function setup(templates: WorksheetTemplate[] = [], selectionCount = 0): ComponentFixture<PlanillasModalComponent> {
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
  TestBed.overrideTemplate(PlanillasModalComponent, '<span>{{ templates().length }}</span>');
  const fx = TestBed.createComponent(PlanillasModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.componentRef.setInput('selectionCount', selectionCount);
  fx.detectChanges();
  return fx;
}

describe('PlanillasModalComponent', () => {
  it('expone las plantillas del store y su conteo de análisis', () => {
    const fx = setup([tpl]);
    expect(fx.componentInstance.templates().length).toBe(1);
    expect(fx.componentInstance.analysisCount(tpl)).toBe(2);
  });

  it('newSheet / editSheet / verDetalle emiten', () => {
    const fx = setup([tpl]);
    const cmp = fx.componentInstance;
    let newE = false; let editId: number | undefined; let verId: number | undefined;
    cmp.newSheet.subscribe(() => (newE = true));
    cmp.editSheet.subscribe(v => (editId = v));
    cmp.verDetalle.subscribe(v => (verId = v));
    cmp.onNewSheet(); cmp.onEdit(5); cmp.onVerDetalle(5);
    expect(newE).toBe(true);
    expect(editId).toBe(5);
    expect(verId).toBe(5);
  });

  it('onCargar NO emite sin muestras seleccionadas (selectionCount 0)', () => {
    const fx = setup([tpl], 0);
    let emitted: number | undefined;
    fx.componentInstance.cargarConPlanilla.subscribe(v => (emitted = v));
    fx.componentInstance.onCargar(5);
    expect(emitted).toBeUndefined();
  });

  it('el kebab abre/cierra y la confirmación de borrado despacha deleteTemplate', () => {
    const fx = setup([tpl]);
    const cmp = fx.componentInstance;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');

    cmp.toggleMenu(5, ev());
    expect(cmp.menuOpen()).toBe(5);
    cmp.askDelete(5, ev());
    expect(cmp.confirmDeleteId()).toBe(5);
    cmp.confirmDelete(5, ev());
    expect(dispatch).toHaveBeenCalledWith(deleteTemplate({ id: 5 }));
    expect(cmp.menuOpen()).toBeNull(); // se cierra tras borrar
  });
});
