import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CuentasDestinoPage } from './cuentas-destino.page';
import {
  selectBankAccounts, selectBankAccountsLoading, selectBankAccountsSaving,
} from '../../store/financiero.selectors';
import { createBankAccount } from '../../store/financiero.actions';

/** Smoke: la ABM de cuentas destino crea una cuenta con el label cargado. */
describe('CuentasDestinoPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentasDestinoPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          selectors: [
            { selector: selectBankAccounts, value: [] },
            { selector: selectBankAccountsLoading, value: false },
            { selector: selectBankAccountsSaving, value: false },
          ],
        }),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('muestra el formulario y el empty-state sin cuentas', () => {
    const fixture = TestBed.createComponent(CuentasDestinoPage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="cuenta-label"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="crear-cuenta"]'))).toBeTruthy();
  });

  it('crear despacha createBankAccount con el label', () => {
    const fixture = TestBed.createComponent(CuentasDestinoPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = fixture.componentInstance as any;
    cmp.label.set('Cuenta Galicia');
    cmp.crear();
    expect(spy).toHaveBeenCalledWith(createBankAccount({
      body: { label: 'Cuenta Galicia', banco: null, titular: null, cbu: null, alias: null, cuit: null },
    }));
  });
});
