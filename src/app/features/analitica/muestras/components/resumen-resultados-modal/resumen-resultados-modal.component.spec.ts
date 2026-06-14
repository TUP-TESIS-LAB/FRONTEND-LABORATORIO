import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ResumenResultadosModalComponent } from './resumen-resultados-modal.component';
import type { ResumenItem } from './resumen-resultados-modal.component';

const items: ResumenItem[] = [
  { resultId: 1, label: 'Colesterol · #1', filled: 1, total: 1, status: 'completa' },
  { resultId: 2, label: 'Triglicéridos · #2', filled: 0, total: 1, status: 'sin' },
  { resultId: 3, label: 'TGO · #3', filled: 1, total: 2, status: 'parcial' },
];

function setup(): ComponentFixture<ResumenResultadosModalComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ResumenResultadosModalComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ResumenResultadosModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.componentRef.setInput('items', items);
  fx.detectChanges();
  return fx;
}

describe('ResumenResultadosModalComponent', () => {
  it('preselecciona solo los completos', () => {
    const cmp = setup().componentInstance;
    expect([...cmp.selected()]).toEqual([1]);
  });
  it('isSelectable solo para completa', () => {
    const cmp = setup().componentInstance;
    expect(cmp.isSelectable(items[0])).toBe(true);
    expect(cmp.isSelectable(items[1])).toBe(false);
    expect(cmp.isSelectable(items[2])).toBe(false);
  });
  it('markCompleted emite los resultIds seleccionados', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const emitted = vi.fn();
    cmp.markCompleted.subscribe(emitted);
    cmp.confirm();
    expect(emitted).toHaveBeenCalledWith([1]);
  });
});
