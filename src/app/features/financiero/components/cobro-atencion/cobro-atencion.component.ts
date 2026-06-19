import {
  ChangeDetectionStrategy, Component, computed, effect, inject, Input, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { MetodoChipComponent } from '../metodo-chip.component';
import { ComprobanteCardComponent } from '../comprobante-card.component';
import { METHOD_META, PaymentMethod } from '../../models/financiero.model';
import {
  registerPayment, resetCobro, loadOpenSession,
} from '../../store/financiero.actions';
import {
  selectIsCajaOpen, selectCobroSubmitting, selectCobroResult,
} from '../../store/financiero.selectors';
import {
  loadAtencion, loadPricing, endBilling,
} from '@features/analitica/store/atencion/atencion.actions';
import {
  selectDetail, selectPricing,
} from '@features/analitica/store/atencion/atencion.selectors';

interface LineaCobro { id: number; method: PaymentMethod; amount: number; reference: string; }

// NOTE: attentionId and embedded use classic @Input() decorator (NOT input.required() / input())
// to work around the known vitest NG0950 bug where input.required() + setInput() fires effects
// before the input value is set. Template is still inline (no templateUrl) per repo convention.
@Component({
  selector: 'fin-cobro-atencion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CurrencyArPipe, MetodoChipComponent, ComprobanteCardComponent],
  template: `
    <div class="fin-cobro">
      <!-- ÉXITO -->
      @if (result(); as r) {
        <div class="fin-cobro__exito" data-testid="cobro-exito">
          <div class="fin-cobro__ring"><i class="pi pi-check"></i></div>
          <h2>Cobraste {{ r.payment.totalAmount | currencyAr }}</h2>
          <fin-comprobante-card [ref]="r.fiscalReference" />
          <div class="fin-cobro__exito-actions">
            <p-button label="Imprimir" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="imprimir()" />
            @if (embedded) {
              <p-button label="Continuar" icon="pi pi-arrow-right" (onClick)="continuarTrasExito()" />
            } @else {
              <p-button label="Cobrar otra atención" severity="secondary" (onClick)="cobrarOtra()" />
              <p-button label="Volver a caja" (onClick)="continuarTrasExito()" />
            }
          </div>
        </div>
      } @else {
        <!-- BLOQUEO SIN CAJA -->
        @if (!cajaAbierta()) {
          <div class="fin-cobro__sin-caja" data-testid="cobro-sin-caja">
            <i class="pi pi-lock"></i>
            <p>No se puede cobrar: no hay una caja abierta.</p>
            <p-button label="Abrir caja" icon="pi pi-unlock" (onClick)="irACaja()" />
          </div>
        } @else {
          <!-- DESGLOSE -->
          <section class="fin-cobro__desglose">
            <div class="fin-cobro__row"><span>Total de estudios</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
            <div class="fin-cobro__row"><span>Cubierto por obra social</span><b>{{ cubierto() | currencyAr }}</b></div>
            <div class="fin-cobro__row fin-cobro__row--target">
              <span>A cobrar al paciente</span><b>{{ aCobrar() | currencyAr }}</b>
            </div>
          </section>

          <!-- LÍNEAS MULTI-MÉTODO -->
          <section class="fin-cobro__lineas">
            @for (l of lineas(); track l.id) {
              <div class="fin-cobro__linea">
                <select [value]="l.method" (change)="setMethod(l.id, $any($event.target).value)" data-testid="linea-metodo">
                  @for (m of metodos; track m) { <option [value]="m">{{ METHOD_META[m].label }}</option> }
                </select>
                <fin-metodo-chip [metodo]="l.method" />
                <input type="number" min="0" [value]="l.amount"
                       (input)="setAmount(l.id, $any($event.target).value)"
                       placeholder="Monto" data-testid="linea-monto" />
                <input type="text" [value]="l.reference"
                       (input)="setReference(l.id, $any($event.target).value)"
                       [placeholder]="METHOD_META[l.method].refLabel" />
                @if (lineas().length > 1) {
                  <button type="button" class="fin-cobro__quitar" (click)="quitarLinea(l.id)" aria-label="Quitar">
                    <i class="pi pi-times"></i>
                  </button>
                }
              </div>
            }
            <p-button label="Agregar medio de pago" icon="pi pi-plus" severity="secondary" [text]="true"
                      (onClick)="agregarLinea()" />
          </section>

          <!-- INDICADOR asignado / total / restante -->
          <section class="fin-cobro__resumen" data-testid="cobro-resumen">
            <div><span>Asignado</span><b>{{ asignado() | currencyAr }}</b></div>
            <div><span>A cobrar</span><b>{{ aCobrar() | currencyAr }}</b></div>
            <div [class.fin-cobro__restante--ok]="restante() === 0">
              <span>Restante</span><b>{{ restante() | currencyAr }}</b>
            </div>
          </section>

          <!-- FACTURA X -->
          <label class="fin-cobro__factura">
            <input type="checkbox" [checked]="optOutElectronic()"
                   (change)="optOutElectronic.set($any($event.target).checked)" />
            No facturar electrónicamente (emitir Factura X)
          </label>

          <!-- CONFIRMAR -->
          <div class="fin-cobro__confirmar">
            <p-button label="Confirmar cobro" icon="pi pi-check" [loading]="submitting()"
                      [disabled]="!puedeConfirmar()" (onClick)="confirmar()"
                      data-testid="cobro-confirmar" />
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .fin-cobro { display: flex; flex-direction: column; gap: 1rem; max-width: 640px; }
    .fin-cobro__row { display: flex; justify-content: space-between; padding: .35rem 0; }
    .fin-cobro__row--target { border-top: 1px solid #e5e7eb; font-size: 1.05rem; }
    .fin-cobro__linea { display: grid; grid-template-columns: 1fr auto 1fr 1fr auto; gap: .5rem; align-items: center; }
    .fin-cobro__linea input, .fin-cobro__linea select { border: 1px solid #d1d5db; border-radius: 6px; padding: .35rem .5rem; }
    .fin-cobro__quitar { border: none; background: transparent; color: #b91c1c; cursor: pointer; }
    .fin-cobro__resumen { display: flex; gap: 1.5rem; background: #f8fafc; border-radius: 8px; padding: .6rem .9rem; }
    .fin-cobro__resumen div { display: flex; flex-direction: column; }
    .fin-cobro__restante--ok b { color: #0f8a55; }
    .fin-cobro__sin-caja, .fin-cobro__exito { display: flex; flex-direction: column; align-items: center; gap: .8rem; padding: 1.5rem; text-align: center; }
    .fin-cobro__ring { width: 64px; height: 64px; border-radius: 999px; background: #e3f6ec; color: #0f8a55; display: grid; place-items: center; font-size: 1.6rem; }
    .fin-cobro__exito-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; }
    .fin-cobro__factura { display: flex; align-items: center; gap: .5rem; font-size: .9rem; }
  `],
})
export class CobroAtencionComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly branchCtx = inject(OperatorBranchContextService);

  // NOTE: Degraded from input.required<number>() / input<boolean>(false) to classic @Input()
  // decorators to work around the known vitest NG0950 bug: input.required() fires effects in
  // the constructor before setInput() assigns the value. Template is still inline per repo convention.
  @Input() attentionId!: number;
  @Input() embedded: boolean = false;

  protected readonly METHOD_META = METHOD_META;
  protected readonly metodos = Object.keys(METHOD_META) as PaymentMethod[];

  protected readonly detail = this.store.selectSignal(selectDetail);
  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly cajaAbierta = this.store.selectSignal(selectIsCajaOpen);
  protected readonly submitting = this.store.selectSignal(selectCobroSubmitting);
  protected readonly result = this.store.selectSignal(selectCobroResult);

  /** monto a cobrar al paciente = pricing.copayment (copago si hay cobertura; total si particular). */
  protected readonly aCobrar = computed(() => this.pricing()?.copayment ?? 0);
  protected readonly cubierto = computed(() => {
    const p = this.pricing();
    return p ? Math.max(0, p.total - p.copayment) : 0;
  });

  protected readonly branchId = computed(() => this.detail()?.branchId ?? this.branchCtx.branchId());

  private nextId = 1;
  protected readonly lineas = signal<LineaCobro[]>([
    { id: 0, method: 'CASH', amount: 0, reference: '' },
  ]);
  protected readonly optOutElectronic = signal(false);

  protected readonly asignado = computed(() =>
    this.lineas().reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
  protected readonly restante = computed(() => round2(this.aCobrar() - this.asignado()));
  protected readonly puedeConfirmar = computed(() =>
    this.cajaAbierta() && this.aCobrar() > 0 && this.restante() === 0 && !this.submitting());

  constructor() {
    // Prefill: la primera línea arranca con el monto a cobrar (efectivo por default).
    effect(() => {
      const target = this.aCobrar();
      const ls = this.lineas();
      if (target > 0 && ls.length === 1 && ls[0].amount === 0) {
        this.lineas.set([{ ...ls[0], amount: target }]);
      }
    });
    effect(() => {
      const b = this.branchId();
      if (b != null) this.store.dispatch(loadOpenSession({ branchId: b }));
    });
  }

  ngOnInit(): void {
    // Asegura detail + pricing para el attentionId dado (ruta directa o wizard).
    // Moved out of constructor effect() since attentionId is now @Input() (not a signal).
    if (this.detail()?.id !== this.attentionId) {
      this.store.dispatch(loadAtencion({ id: this.attentionId }));
    }
    if (!this.pricing()) {
      this.store.dispatch(loadPricing({ attentionId: this.attentionId }));
    }
  }

  protected agregarLinea(): void {
    this.lineas.update(ls => [...ls, { id: this.nextId++, method: 'CASH', amount: 0, reference: '' }]);
  }
  protected quitarLinea(id: number): void {
    this.lineas.update(ls => ls.filter(l => l.id !== id));
  }
  protected setMethod(id: number, method: PaymentMethod): void {
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, method } : l));
  }
  protected setAmount(id: number, raw: string): void {
    const amount = Number(raw) || 0;
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, amount } : l));
  }
  protected setReference(id: number, reference: string): void {
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, reference } : l));
  }

  protected confirmar(): void {
    const p = this.pricing();
    const d = this.detail();
    const branch = this.branchId();
    if (!p || branch == null) return;
    const collections = this.lineas().map(l => ({
      method: l.method, amount: Number(l.amount) || 0,
      reference: l.reference.trim() ? l.reference.trim() : null,
    }));
    const details = p.items.map(it => ({
      analysisId: it.analysisId,
      coverageId: d?.insurancePlanId ?? null,
      covered: it.authorized,
      chargedAmount: it.precioPaciente,
    }));
    this.store.dispatch(registerPayment({
      body: {
        attentionId: this.attentionId,
        branchId: branch,
        totalAmount: round2(this.asignado()),
        copaymentAmount: d?.copaymentAmount ?? p.copayment,
        collections,
        details,
        operatorOptedOutOfElectronic: this.optOutElectronic(),
      },
    }));
  }

  /** Tras el éxito: avanzar la atención (endBilling) y navegar/cerrar según el contexto. */
  protected continuarTrasExito(): void {
    this.store.dispatch(endBilling({ id: this.attentionId }));
    this.store.dispatch(resetCobro());
    if (!this.embedded) this.router.navigate(['/financiero/caja']);
    // embedded: el wizard auto-avanza a 'confirmar' por el cambio de estado.
  }
  protected cobrarOtra(): void {
    this.store.dispatch(endBilling({ id: this.attentionId }));
    this.store.dispatch(resetCobro());
    this.router.navigate(['/turnos/recepcion']);
  }
  protected irACaja(): void { this.router.navigate(['/financiero/caja']); }
  protected imprimir(): void { window.print(); }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
