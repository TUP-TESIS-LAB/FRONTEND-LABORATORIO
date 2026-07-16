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
import { CajaContextService } from '../../services/caja-context.service';

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
      {
        provide: CajaContextService,
        useValue: {
          selectedRegisterId: signal<number | null>(5),
          selectedFor: (_b: number) => 5,
          select: () => {},
          clear: () => {},
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

  it('el monto a cobrar es pricing.total (subtotal no cubierto + copago), no copayment', () => {
    // Caso real del backend: paciente particular → subtotal>0, copayment(copago manual)=0,
    // total = subtotal + copago. El monto a cobrar debe ser `total`, no `copayment` (que sería $0).
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: {
        items: [{ analysisId: 1, authorized: false, precioPaciente: 525, cantidadUb: 1.5, valorUbParticular: 350 }],
        subtotal: 525, copayment: 0, total: 525,
      },
    });
    const cmp = fixture.componentInstance as any;
    expect(cmp.aCobrar()).toBe(525);

    cmp.lineas.set([{ id: 0, method: 'CASH', amount: 525, reference: '' }]);
    fixture.detectChanges();
    expect(cmp.puedeConfirmar()).toBe(true);

    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.confirmar();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: registerPayment.type,
      body: expect.objectContaining({ totalAmount: 525 }),
    }));
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

describe('CobroAtencionComponent — poder tipear el monto de una (KAN-249)', () => {
  function buildFixture(total: number) {
    return setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: total, copayment: 0, total },
    });
  }

  it('la única línea arranca precargada con el monto a cobrar', () => {
    const c = buildFixture(1500).componentInstance as any;
    expect(c.lineas()[0].amount).toBe(1500);
  });

  it('vaciar el campo NO lo re-rellena solo con el total (se puede tipear otro monto)', () => {
    // El operador borra el monto precargado para escribir otro. p-inputNumber emite null
    // al vaciarse → setAmount lo normaliza a 0. El prefill NO debe volver a dispararse:
    // si lo hace, el campo "revive" con el total y es imposible escribir de cero.
    const fixture = buildFixture(1500);
    const c = fixture.componentInstance as any;
    expect(c.lineas()[0].amount).toBe(1500);

    c.setAmount(c.lineas()[0].id, null);
    fixture.detectChanges();

    expect(c.lineas()[0].amount).toBe(0);
  });

  it('el prefill es one-shot: no revive al cambiar el pricing tras haber vaciado el campo', () => {
    const fixture = buildFixture(1500);
    const c = fixture.componentInstance as any;
    c.setAmount(c.lineas()[0].id, null);
    fixture.detectChanges();

    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectPricing, { items: [], subtotal: 900, copayment: 0, total: 900 });
    store.refreshState();
    fixture.detectChanges();

    expect(c.lineas()[0].amount).toBe(0);
  });
});

describe('CobroAtencionComponent — excedente permitido, sin clamp ni re-sync', () => {
  // Reusa el harness setupWithTemplate (Store + Router + contexto de sucursal/caja mockeados)
  // en vez del build() minimalista del brief: el componente inyecta OperatorBranchContextService
  // y CajaContextService, no sólo el Store, así que provideMockStore solo no alcanza para montar.
  //
  // NOTA: el clamp de setAmount() y el re-sync waterfall del constructor se sacaron a propósito
  // (pedido explícito del usuario) para permitir pagar de más — el "Restante" negativo se muestra
  // como "Excedente" en ámbar en vez de bloquearse. Estos tests reemplazan a los viejos que
  // verificaban el clamp/waterfall, que ya no existen.
  function build(total: number) {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: total, copayment: 0, total },
    });
    return fixture.componentInstance as any;
  }

  it('setAmount ya no clampea: una línea puede superar A cobrar (excedente)', () => {
    const c = build(100);
    const lineId = c.lineas()[0].id;
    c.setAmount(lineId, 500);
    expect(c.asignado()).toBe(500);
    expect(c.restante()).toBe(-400);       // negativo = excedente, ya no se fuerza a 0
  });

  it('con dos líneas, la suma puede superar el total sin clampearse', () => {
    const c = build(100);
    const first = c.lineas()[0].id;
    c.setAmount(first, 60);
    c.agregarLinea();
    const second = c.lineas()[1].id;
    c.setAmount(second, 80);               // 60 + 80 = 140 > 100
    expect(c.asignado()).toBe(140);
    expect(c.restante()).toBe(-40);
  });

  it('si el total baja después de cargar montos, las líneas NO se reajustan solas', () => {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: 100, copayment: 0, total: 100 },
    });
    const c = fixture.componentInstance as any;
    const first = c.lineas()[0].id;
    c.setAmount(first, 60);
    c.agregarLinea();
    const second = c.lineas()[1].id;
    c.setAmount(second, 40);
    expect(c.asignado()).toBe(100);

    // el total baja a 80: sin el waterfall viejo, las líneas quedan como estaban
    // (60 + 40 = 100) y el excedente de 20 se refleja en restante(), no se absorbe solo.
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectPricing, { items: [], subtotal: 80, copayment: 0, total: 80 });
    store.refreshState();
    fixture.detectChanges();

    expect(c.aCobrar()).toBe(80);
    expect(c.lineas()[0].amount).toBe(60);
    expect(c.lineas()[1].amount).toBe(40);
    expect(c.asignado()).toBe(100);
    expect(c.restante()).toBe(-20);
  });

  it('restanteColor: verde exacto, rojo si falta plata, ámbar si hay excedente', () => {
    const c = build(100);
    const lineId = c.lineas()[0].id;

    c.setAmount(lineId, 100);
    expect(c.restante()).toBe(0);
    expect(c.restanteColor()).toBe('var(--ds-success)');

    c.setAmount(lineId, 40);
    expect(c.restante()).toBe(60);
    expect(c.restanteColor()).toBe('var(--ds-danger)');

    c.setAmount(lineId, 150);
    expect(c.restante()).toBe(-50);
    expect(c.restanteColor()).toBe('var(--ds-warning)');
  });
});
