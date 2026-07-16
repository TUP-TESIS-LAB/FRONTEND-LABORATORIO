import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BranchBadgeComponent } from './branch-badge.component';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

describe('BranchBadgeComponent', () => {
  function setup(name: string | null) {
    const ctx = {
      branchName: signal<string | null>(name).asReadonly(),
      branchId: signal<number | null>(name ? 1 : null).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OperatorBranchContextService, useValue: ctx }],
    });
    const fixture = TestBed.createComponent(BranchBadgeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el nombre cuando hay sucursal seteada', () => {
    const fixture = setup('Sucursal Central');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sucursal Central');
    expect(text).toContain('Sucursal:');
  });

  it('renderiza "Sin sucursal" cuando no hay sucursal', () => {
    const fixture = setup(null);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sin sucursal');
  });

  it('aplica clase --unset cuando no hay sucursal', () => {
    const fixture = setup(null);
    const chip = fixture.nativeElement.querySelector('.ui-branch-badge--unset');
    expect(chip).not.toBeNull();
  });
});
