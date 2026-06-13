import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { WorksheetConfigModalComponent } from './worksheet-config-modal.component';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { selectTemplates } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { saveTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';
import type { Analysis } from '@features/analitica/models/atencion.model';

function analysis(id: number, name: string): Analysis {
  return { id, shortCode: String(id), name, familyName: null, ubCount: null };
}

function setup(templateId: number | null = null) {
  const analysisSvc = {
    searchByName: vi.fn().mockReturnValue(of([])),
    getById: vi.fn().mockReturnValue(of({ id: 10, shortCode: '10', name: 'Hemograma', familyName: null, ubCount: null, description: null, determinations: [], processingTime: null, processingTimeUnit: null, nbuCode: null })),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WorksheetConfigModalComponent],
    providers: [
      provideNoopAnimations(),
      { provide: AnalysisService, useValue: analysisSvc },
      provideMockStore({
        selectors: [{ selector: selectTemplates, value: [
          { id: 5, name: 'Coag', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1 },
        ] }],
      }),
    ],
  });
  const fx = TestBed.createComponent(WorksheetConfigModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.componentRef.setInput('templateId', templateId);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store, analysisSvc };
}

describe('WorksheetConfigModalComponent', () => {
  it('agregar y quitar análisis actualiza la lista ordenada', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'Hemograma'));
    cmp.add(analysis(11, 'Glucosa'));
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([10, 11]);
    cmp.removeAt(10);
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([11]);
  });

  it('no agrega duplicados', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'Hemograma'));
    cmp.add(analysis(10, 'Hemograma'));
    expect(cmp.ordered().length).toBe(1);
  });

  it('moveItem reordena', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'A'));
    cmp.add(analysis(11, 'B'));
    cmp.moveItem(0, 1);
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([11, 10]);
  });

  it('valid requiere nombre y al menos un análisis', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    expect(cmp.valid()).toBe(false);
    cmp.name.set('Coagulación');
    expect(cmp.valid()).toBe(false);
    cmp.add(analysis(10, 'A'));
    expect(cmp.valid()).toBe(true);
  });

  it('save dispara saveTemplate con displayOrder por índice y emite saved', () => {
    const { fx, store } = setup();
    const cmp = fx.componentInstance;
    const dispatch = vi.spyOn(store, 'dispatch');
    const saved = vi.fn();
    cmp.saved.subscribe(saved);
    cmp.name.set('Coagulación');
    cmp.add(analysis(10, 'A'));
    cmp.add(analysis(11, 'B'));
    cmp.save();
    expect(dispatch).toHaveBeenCalledWith(saveTemplate({
      id: null, name: 'Coagulación',
      analyses: [{ analysisTypeId: 10, displayOrder: 0 }, { analysisTypeId: 11, displayOrder: 1 }],
    }));
    expect(saved).toHaveBeenCalled();
  });

  it('al editar resuelve nombres del template vía getById', () => {
    const { analysisSvc } = setup(5);
    expect(analysisSvc.getById).toHaveBeenCalledWith(10);
  });
});
