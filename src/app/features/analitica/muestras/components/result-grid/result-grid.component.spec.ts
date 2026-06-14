import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ResultGridComponent } from './result-grid.component';
import type { ResultGrid } from '../../models/resultado.model';

const grid: ResultGrid = {
  protocolId: 9,
  sections: [{
    analysisCatalogId: 6, analysisName: 'Colesterol Total', resultIds: [1],
    rows: [{ catalogId: 500, name: 'Colesterol Total', unit: 'mg/dL', cells: { 1: { determinationId: 11, value: '' } } }],
  }],
};

function setup(): ComponentFixture<ResultGridComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ResultGridComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ResultGridComponent);
  fx.componentRef.setInput('grid', grid);
  fx.detectChanges();
  return fx;
}

describe('ResultGridComponent', () => {
  it('inicializa los valores desde el grid', () => {
    const cmp = setup().componentInstance;
    expect(cmp.valueOf(1, 500)).toBe('');
  });

  it('setValue marca dirty y buildPayload incluye solo modificadas con valor', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    cmp.setValue(1, 500, '195');
    const payload = cmp.buildPayload();
    expect(payload).toEqual([{ resultId: 1, items: [{ determinationId: 11, resultValue: '195', observations: null }] }]);
  });

  it('buildPayload vacío si no hubo cambios', () => {
    const cmp = setup().componentInstance;
    expect(cmp.buildPayload()).toEqual([]);
  });

  it('save emite el payload', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const saved = vi.fn();
    cmp.save.subscribe(saved);
    cmp.setValue(1, 500, '195');
    cmp.onSave();
    expect(saved).toHaveBeenCalledWith([{ resultId: 1, items: [{ determinationId: 11, resultValue: '195', observations: null }] }]);
  });
});
