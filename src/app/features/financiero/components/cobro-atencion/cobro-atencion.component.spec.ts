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

describe('CobroAtencionComponent — restante nunca negativo', () => {
  // Reusa el harness setupWithTemplate (Store + Router + contexto de sucursal/caja mockeados)
  // en vez del build() minimalista del brief: el componente inyecta OperatorBranchContextService
  // y CajaContextService, no sólo el Store, así que provideMockStore solo no alcanza para montar.
  function build(total: number) {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: total, copayment: 0, total },
    });
    return fixture.componentInstance as any;
  }

  it('clampa el monto de una línea para no superar A cobrar', () => {
    const c = build(100);
    const lineId = c.lineas()[0].id;
    c.setAmount(lineId, '500');           // intento sobre-asignar
    expect(c.asignado()).toBe(100);        // clampeado al total
    expect(c.restante()).toBe(0);          // nunca negativo
  });

  it('con dos líneas, la segunda no puede empujar el asignado sobre el total', () => {
    const c = build(100);
    const first = c.lineas()[0].id;
    c.setAmount(first, '60');
    c.agregarLinea();
    const second = c.lineas()[1].id;
    c.setAmount(second, '80');             // 60 + 80 = 140 > 100
    expect(c.asignado()).toBe(100);        // la 2da se clampa a 40
    expect(c.restante()).toBe(0);
  });

  // Step 4: re-sync del prefill cuando el total baja (p. ej. se editó el copago
  // en el paso anterior). Simulamos el cambio de pricing con overrideSelector +
  // refreshState + detectChanges, para que el effect vuelva a correr.
  function retarget(fixture: any, total: number) {
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectPricing, { items: [], subtotal: total, copayment: 0, total });
    store.refreshState();
    fixture.detectChanges();
  }

  it('re-sync convergente: el total baja y la última línea se achica (restante 0)', () => {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: 100, copayment: 0, total: 100 },
    });
    const c = fixture.componentInstance as any;
    // dos líneas 60 + 40 = 100 (asignado == total)
    const first = c.lineas()[0].id;
    c.setAmount(first, '60');
    c.agregarLinea();
    const second = c.lineas()[1].id;
    c.setAmount(second, '40');
    expect(c.asignado()).toBe(100);

    // el total baja a 80: exceso = 20 <= 40 (última línea) → última pasa a 20
    retarget(fixture, 80);
    expect(c.aCobrar()).toBe(80);
    expect(c.lineas()[0].amount).toBe(60);   // la primera intacta
    expect(c.lineas()[1].amount).toBe(20);   // la última absorbió el exceso
    expect(c.asignado()).toBe(80);
    expect(c.restante()).toBe(0);
  });

  it('re-sync patológico: exceso > última línea → waterfall, sin loop, restante >= 0', () => {
    const fixture = setupWithTemplate(MINIMAL_FORM_TEMPLATE, {
      pricing: { items: [], subtotal: 100, copayment: 0, total: 100 },
    });
    const c = fixture.componentInstance as any;
    // dos líneas 50 + 50 = 100
    const first = c.lineas()[0].id;
    c.setAmount(first, '50');
    c.agregarLinea();
    const second = c.lineas()[1].id;
    c.setAmount(second, '50');
    expect(c.asignado()).toBe(100);

    // el total baja a 10: exceso = 90 > 50 (última) → última a 0, la primera absorbe 40
    // (sin el waterfall + guard, este caso quedaba asignado=50>10 y loopeaba el effect).
    retarget(fixture, 10);
    expect(c.aCobrar()).toBe(10);
    expect(c.asignado()).toBeLessThanOrEqual(c.aCobrar());
    expect(c.restante()).toBeGreaterThanOrEqual(0);
    expect(c.asignado()).toBe(10);
    expect(c.restante()).toBe(0);
    // valores concretos del waterfall: última a 0, primera recortada a 10
    expect(c.lineas()[1].amount).toBe(0);
    expect(c.lineas()[0].amount).toBe(10);
  });
});
