import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TransitionDialogComponent } from './transition-dialog.component';
import type { Transition } from '../../models/transition.model';
import type { Sample } from '../../models/sample.model';

function makeSample(over: Partial<Sample> = {}): Sample {
  return {
    id: 's-1', barcode: 'MX-2606-40801', study: 'Hemograma',
    patient: 'García, M.', branch: 'CENTRAL — Sede Central',
    receivedAt: '2026-06-07T08:42:00Z', urgent: false, state: 'transito',
    ...over,
  };
}

function makeTransition(over: Partial<Transition> = {}): Transition {
  return {
    key: 'area', label: 'Asignar a área', toLabel: 'En proceso', toState: 'processing',
    color: 'green', icon: 'pi-inbox', desc: '', fields: [],
    ...over,
  };
}

describe('TransitionDialogComponent', () => {
  let fixture: ComponentFixture<TransitionDialogComponent>;
  let component: TransitionDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransitionDialogComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(TransitionDialogComponent);
    component = fixture.componentInstance;
  });

  it('canConfirm es true si fields=[]', () => {
    fixture.componentRef.setInput('transition', makeTransition({ fields: [] }));
    fixture.componentRef.setInput('samples', [makeSample()]);
    fixture.componentRef.setInput('currentBranch', 'CENTRAL — Sede Central');
    fixture.componentRef.setInput('branches', []);
    fixture.componentRef.setInput('areas', []);
    fixture.componentRef.setInput('labs', []);
    fixture.detectChanges();
    expect(component.canConfirm()).toBe(true);
  });

  it('canConfirm es false con fields=["areaFixed"] hasta elegir area', () => {
    fixture.componentRef.setInput('transition', makeTransition({ fields: ['areaFixed'] }));
    fixture.componentRef.setInput('samples', [makeSample()]);
    fixture.componentRef.setInput('currentBranch', 'CENTRAL — Sede Central');
    fixture.componentRef.setInput('branches', []);
    fixture.componentRef.setInput('areas', ['Hematología', 'Microbiología']);
    fixture.componentRef.setInput('labs', []);
    fixture.detectChanges();
    expect(component.canConfirm()).toBe(false);
    component.dest.update(d => ({ ...d, area: 'Hematología' }));
    expect(component.canConfirm()).toBe(true);
  });

  it('canConfirm requiere sucursal + area si fields=["sucursal","area"]', () => {
    fixture.componentRef.setInput('transition', makeTransition({
      fields: ['sucursal', 'area'],
      key: 'reroute', toState: 'transito',
    }));
    fixture.componentRef.setInput('samples', [makeSample()]);
    fixture.componentRef.setInput('currentBranch', 'CENTRAL — Sede Central');
    fixture.componentRef.setInput('branches', ['NORTE — Belgrano']);
    fixture.componentRef.setInput('areas', ['Hematología']);
    fixture.componentRef.setInput('labs', []);
    fixture.detectChanges();
    expect(component.canConfirm()).toBe(false);
    component.dest.update(d => ({ ...d, sucursal: 'NORTE — Belgrano' }));
    expect(component.canConfirm()).toBe(false);
    component.dest.update(d => ({ ...d, area: 'Hematología' }));
    expect(component.canConfirm()).toBe(true);
  });

  it('confirm emite { dest, note } con valores actuales', () => {
    fixture.componentRef.setInput('transition', makeTransition({ fields: ['lab'], key: 'derived' }));
    fixture.componentRef.setInput('samples', [makeSample()]);
    fixture.componentRef.setInput('currentBranch', 'CENTRAL — Sede Central');
    fixture.componentRef.setInput('branches', []);
    fixture.componentRef.setInput('areas', []);
    fixture.componentRef.setInput('labs', [{ id: 7, name: 'CIBIC — Alta complejidad' }]);
    fixture.detectChanges();

    // TransitionDest.lab es el ID numérico del laboratorio externo (KAN-226/227), no su nombre.
    let payload: { dest: { lab?: number }; note: string } | null = null;
    component.confirm.subscribe(p => { payload = p; });

    component.dest.update(d => ({ ...d, lab: 7 }));
    component.note.set('observación de prueba');
    component.onConfirm();

    expect(payload).not.toBeNull();
    expect(payload!.dest.lab).toBe(7);
    expect(payload!.note).toBe('observación de prueba');
  });
});
