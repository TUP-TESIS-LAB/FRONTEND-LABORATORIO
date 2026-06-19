import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CobroAtencionComponent } from './cobro-atencion.component';
import { selectIsCajaOpen, selectCobroSubmitting, selectCobroResult } from '../../store/financiero.selectors';
import { selectDetail, selectPricing } from '@features/analitica/store/atencion/atencion.selectors';
import { registerPayment } from '../../store/financiero.actions';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

// Minimal template for tests that need to render the form UI (caja abierta).
// Used to avoid NG0950 thrown by MetodoChipComponent.metodo (input.required()) being
// rendered before its binding resolves — known vitest/jsdom issue with child components
// that use input.required() inside @for blocks.
const MINIMAL_FORM_TEMPLATE = `
  <div class="fin-cobro">
    @if (result(); as r) {
      <div data-testid="cobro-exito"></div>
    } @else {
      @if (!cajaAbierta()) {
        <div data-testid="cobro-sin-caja"></div>
      } @else {
        <div data-testid="cobro-resumen">
          <div><span>A cobrar</span><b data-testid="a-cobrar">{{ aCobrar() }}</b></div>
        </div>
        <div data-testid="cobro-confirmar" [attr.disabled]="!puedeConfirmar() ? true : null">
        </div>
      }
    }
  </div>
`;

const DEFAULT_DETAIL = { id: 7, branchId: 3, insurancePlanId: null, copaymentAmount: null };
const DEFAULT_PRICING = {
  items: [{ analysisId: 1, authorized: false, precioPaciente: 1500, cantidadUb: 0, valorUbParticular: null }],
  subtotal: 1500,
  copayment: 1500,
  total: 1500,
};

function setupWithTemplate(
  templateOverride: string | null,
  overrides: { cajaAbierta?: boolean; pricing?: any; detail?: any; result?: any } = {},
) {
  const module = TestBed.configureTestingModule({
    imports: [CobroAtencionComponent],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      {
        provide: OperatorBranchContextService,
        useValue: {
          branchId: signal<number | null>(3),
          branchName: signal<string | null>('Sucursal Test'),
        },
      },
      provideMockStore({
        selectors: [
          { selector: selectIsCajaOpen, value: overrides.cajaAbierta ?? true },
          { selector: selectCobroSubmitting, value: false },
          { selector: selectCobroResult, value: overrides.result ?? null },
          { selector: selectDetail, value: overrides.detail ?? DEFAULT_DETAIL },
          { selector: selectPricing, value: overrides.pricing ?? DEFAULT_PRICING },
        ],
      }),
    ],
  });
  if (templateOverride) {
    module.overrideTemplate(CobroAtencionComponent, templateOverride);
  }
  const fixture = TestBed.createComponent(CobroAtencionComponent);
  fixture.componentInstance.attentionId = 7;
  fixture.detectChanges();
  return fixture;
}

describe('CobroAtencionComponent — smoke tests', () => {
  it('sin caja abierta muestra el bloqueo y NO el formulario', () => {
    // Uses minimal template — full template is fine here since form is not rendered (cajaAbierta=false)
    // but MetodoChipComponent still gets compiled so we use the minimal template to be safe.
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, { cajaAbierta: false });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="cobro-sin-caja"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="cobro-confirmar"]')).toBeFalsy();
  });

  it('confirmar deshabilitado si la suma no coincide con el monto', () => {
    // Uses minimal template to avoid MetodoChipComponent input.required() NG0950 in vitest.
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], copayment: 2000, total: 2000, subtotal: 2000 },
    });
    const cmp = fixture.componentInstance as any;
    cmp.lineas.set([{ id: 0, method: 'CASH', amount: 500, reference: '' }]);
    fixture.detectChanges();
    expect(cmp.puedeConfirmar()).toBe(false);
  });

  it('confirmar con suma = monto dispara registerPayment', () => {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE);
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const cmp = fixture.componentInstance as any;
    cmp.lineas.set([{ id: 0, method: 'CASH', amount: 1500, reference: '' }]);
    fixture.detectChanges();
    cmp.confirmar();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: registerPayment.type }));
  });

  it('con result muestra la pantalla de éxito', () => {
    // Full template is fine here — the result branch renders ComprobanteCardComponent (not MetodoChipComponent).
    const fixture = setupWithTemplate(null, {
      result: {
        payment: { totalAmount: 1500 },
        fiscalReference: {
          id: 1, paymentId: 99, provider: 'NONE', comprobanteTipo: 'FACTURA_X',
          internalReference: 'R-0001', externalInvoiceId: null, electronic: false,
          isVoid: false, emittedAt: '2026-06-19T10:00:00Z',
        },
      },
    });
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="cobro-exito"]')).toBeTruthy();
  });
});
