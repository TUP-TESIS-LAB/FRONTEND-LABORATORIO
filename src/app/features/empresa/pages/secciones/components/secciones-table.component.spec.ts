import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SeccionesTableComponent } from './secciones-table.component';
import { BranchTag } from '../../../models/section-list-item.model';

function branches(n: number): BranchTag[] {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, code: `B${i + 1}`, name: `Suc ${i + 1}` }));
}

describe('SeccionesTableComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [SeccionesTableComponent],
      providers: [provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(SeccionesTableComponent);
    fixture.componentRef.setInput('secciones', []);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('visibleBranches muestra hasta 3 tags', () => {
    const cmp = setup();
    expect(cmp.visibleBranches(branches(5)).length).toBe(3);
    expect(cmp.visibleBranches(branches(2)).length).toBe(2);
  });

  it('extraBranches cuenta el sobrante sobre 3', () => {
    const cmp = setup();
    expect(cmp.extraBranches(branches(5))).toBe(2);
    expect(cmp.extraBranches(branches(3))).toBe(0);
    expect(cmp.extraBranches(branches(0))).toBe(0);
  });
});
