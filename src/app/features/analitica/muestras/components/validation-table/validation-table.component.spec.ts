import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ValidationTableComponent } from './validation-table.component';
import type { ValidationResultVM } from '../../models/postanalitica.model';

const results: ValidationResultVM[] = [{
  resultId: 1, status: 'VALIDATING',
  rows: [{ determinationId: 500, name: 'Colesterol Total', aggregateOutcome: 'PASS', manualOutcome: null }],
}];

function setup(rs: ValidationResultVM[] = results): ComponentFixture<ValidationTableComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ValidationTableComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ValidationTableComponent);
  fx.componentRef.setInput('results', rs);
  fx.detectChanges();
  return fx;
}

describe('ValidationTableComponent', () => {
  it('renderiza results y filas', () => {
    const cmp = setup().componentInstance;
    expect(cmp.results().length).toBe(1);
  });
  it('onValidate emite {resultId, determinationId, outcome}', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const spy = vi.fn();
    cmp.validate.subscribe(spy);
    cmp.onValidate(1, 500, 'FAIL');
    expect(spy).toHaveBeenCalledWith({ resultId: 1, determinationId: 500, outcome: 'FAIL' });
  });
  it('onValidateAll emite {resultId, outcome}', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const spy = vi.fn();
    cmp.validateAll.subscribe(spy);
    cmp.onValidateAll(1, 'PASS');
    expect(spy).toHaveBeenCalledWith({ resultId: 1, outcome: 'PASS' });
  });
  it('canSign true solo si VALIDATED', () => {
    const cmp = setup([{ ...results[0], status: 'VALIDATED' }]).componentInstance;
    expect(cmp.canSign({ ...results[0], status: 'VALIDATED' })).toBe(true);
    expect(cmp.canSign(results[0])).toBe(false);
  });
});
