import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY } from 'rxjs';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GenerarLiquidacionPage } from './generar-liquidacion.page';
import {
  selectLiqInsurers, selectLiqGenerating, selectLiqPreviewDetail, selectLiqPreviewLoading,
} from '../../store/financiero.selectors';
import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';

describe('GenerarLiquidacionPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarLiquidacionPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockActions(() => EMPTY),
        provideMockStore({
          selectors: [
            { selector: selectLiqInsurers, value: [{ id: 7, code: 'OS7', acronym: 'OS', name: 'IOMA', insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true }] },
            { selector: selectLiqGenerating, value: false },
            { selector: selectLiqPreviewDetail, value: null },
            { selector: selectLiqPreviewLoading, value: false },
          ],
        }),
      ],
    })
      .overrideComponent(WizardShellComponent, { set: { template: '<ng-content />', inputs: [] } })
      .compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('arranca en el paso 1 (Datos) con el wizard shell', () => {
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ui-wizard-shell'))).toBeTruthy();
  });

  it('el paso 1 no permite continuar sin OS ni período', () => {
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as { paso1Valido: () => boolean };
    fixture.detectChanges();
    expect(cmp.paso1Valido()).toBe(false);
  });
});
