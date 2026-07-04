import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { SubcajasPage } from './subcajas.page';
import { selectCashRegisters, selectCashRegistersLoading } from '../../store/financiero.selectors';
import { createCashRegister } from '../../store/financiero.actions';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

/** Smoke: la ABM de subcajas crea una caja con el nombre cargado. */
describe('SubcajasPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubcajasPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: selectCashRegisters, value: [] },
            { selector: selectCashRegistersLoading, value: false },
          ],
        }),
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: signal<number | null>(3), branchName: signal<string | null>('Suc') },
        },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('muestra el empty-state cuando no hay cajas', () => {
    const fixture = TestBed.createComponent(SubcajasPage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="nueva-caja-nombre"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="crear-caja"]'))).toBeTruthy();
  });

  it('crear despacha createCashRegister con la sucursal activa', () => {
    const fixture = TestBed.createComponent(SubcajasPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = fixture.componentInstance as any;
    cmp.nombre.set('Caja mostrador');
    cmp.crear();
    expect(spy).toHaveBeenCalledWith(createCashRegister({ branchId: 3, name: 'Caja mostrador' }));
  });
});
