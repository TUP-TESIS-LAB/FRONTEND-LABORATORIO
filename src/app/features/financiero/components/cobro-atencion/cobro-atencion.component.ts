import {
  ChangeDetectionStrategy, Component, computed, effect, inject, Input, numberAttribute, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { CajaContextService } from '../../services/caja-context.service';
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

// NOTE: attentionId usa classic @Input() decorator (NOT input.required() / input())
// to work around the known vitest NG0950 bug where input.required() + setInput() fires effects
// before the input value is set. Template is still inline (no templateUrl) per repo convention.
// Este componente solo se usa embebido en el wizard de atención — la ruta standalone
// `/financiero/cobrar/:id` era código muerto (nada en la app la enlazaba) y se sacó.
@Component({
  selector: 'fin-cobro-atencion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ButtonModule, SelectModule, InputTextModule, InputNumberModule, CheckboxModule,
    CurrencyArPipe, ComprobanteCardComponent,
  ],
  template: `
    <div class="fin-cobro">
      <!-- ÉXITO: comprobante suelto a la izquierda (misma card que usa cobro-detalle,
           sin envoltorio extra para no duplicar el borde/blanco) y card de confirmación
           con las acciones abajo, fija a la derecha. -->
      @if (result(); as r) {
        <div data-testid="cobro-exito">
          <!-- U5 (KAN-246): aviso de negocio — el comprobante no-electrónico no tiene
               validez fiscal, y antes eso solo se insinuaba con un badge gris chiquito. -->
          @if (!r.fiscalReference.electronic) {
            <div class="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
              <i class="pi pi-exclamation-triangle"></i>
              <span>Recibo interno — sin validez fiscal.</span>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          <fin-comprobante-card [ref]="r.fiscalReference" />

          <div class="flex flex-col gap-4 sticky top-0">
            <div class="border border-surface-200 rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-3">
              <div class="fin-cobro__ring"><i class="pi pi-check"></i></div>
              <h2 class="text-lg font-bold m-0">Cobraste {{ r.payment.totalAmount | currencyAr }}</h2>
            </div>

            <div class="fin-cobro__exito-actions">
              <p-button label="Imprimir" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="imprimir()" />
              <p-button label="Continuar" icon="pi pi-arrow-right" (onClick)="continuarTrasExito()" />
            </div>
          </div>
          </div>
        </div>
      } @else {
        <!-- BLOQUEO SIN CAJA -->
        @if (!cajaAbierta() || cashRegisterId() == null) {
          <div class="fin-cobro__sin-caja" data-testid="cobro-sin-caja">
            <i class="pi pi-lock"></i>
            @if (cashRegisterId() == null) {
              <p>Elegí y abrí una caja antes de cobrar.</p>
            } @else {
              <p>No se puede cobrar: la caja seleccionada está cerrada.</p>
            }
            <p-button label="Ir a Caja" icon="pi pi-unlock" (onClick)="irACaja()" />
          </div>
        } @else {
          <!-- Dos columnas: líneas de pago a la izquierda (ancho flexible) y card de
             resumen fija a la derecha — mismo patrón que el paso de cobro del wizard. -->
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
            <!-- LÍNEAS MULTI-MÉTODO -->
            <div class="border border-surface-200 rounded-xl shadow-sm p-4">
              <div class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-3">Medios de pago</div>
              <div class="flex flex-col gap-2">
                @if (lineas().length > 0) {
                  <div class="grid gap-2 text-xs font-medium uppercase tracking-wide text-surface-400 px-0.5"
                       [style.grid-template-columns]="lineas().length > 1 ? '1.3fr 1fr 1fr auto' : '1.3fr 1fr 1fr'">
                    <span>Método</span><span>Monto</span><span>Referencia</span>
                    @if (lineas().length > 1) { <span></span> }
                  </div>
                }
                @for (l of lineas(); track l.id) {
                  <div class="grid gap-2 items-center"
                       [style.grid-template-columns]="lineas().length > 1 ? '1.3fr 1fr 1fr auto' : '1.3fr 1fr 1fr'">
                    <p-select [ngModel]="l.method" (ngModelChange)="setMethod(l.id, $event)"
                              [options]="metodoOptions" optionLabel="label" optionValue="value"
                              appendTo="body" styleClass="w-full" data-testid="linea-metodo" />
                    <p-inputNumber [ngModel]="l.amount" (ngModelChange)="setAmount(l.id, $event)"
                                   mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0"
                                   inputStyleClass="w-full text-right" placeholder="0,00" data-testid="linea-monto" />
                    <input pInputText [ngModel]="l.reference" (ngModelChange)="setReference(l.id, $event)"
                           class="w-full" [placeholder]="METHOD_META[l.method].refLabel" />
                    @if (lineas().length > 1) {
                      <button type="button" class="border-0 bg-transparent text-red-600 hover:text-red-700 cursor-pointer" (click)="quitarLinea(l.id)" aria-label="Quitar">
                        <i class="pi pi-times"></i>
                      </button>
                    }
                  </div>
                }
                <p-button label="Agregar medio de pago" icon="pi pi-plus" severity="secondary" [text]="true"
                          (onClick)="agregarLinea()" />
              </div>

              <div class="flex items-center gap-2 mt-4 pt-4 border-t border-surface-200">
                <p-checkbox [binary]="true" [ngModel]="optOutElectronic()" (ngModelChange)="optOutElectronic.set($event)"
                            inputId="opt-out-electronic" />
                <label for="opt-out-electronic" class="text-sm cursor-pointer">No facturar electrónicamente</label>
              </div>
            </div>

            <!-- RESUMEN + CONFIRMAR -->
            <div class="border border-surface-200 rounded-xl shadow-sm p-4 sticky top-0" data-testid="cobro-resumen">
              <div class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-3">Resumen</div>
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-surface-500">Estudios a cargo</span>
                <span class="font-semibold">{{ pricing()?.subtotal ?? 0 | currencyAr }}</span>
              </div>
              @if ((pricing()?.copayment ?? 0) > 0) {
                <div class="flex items-center justify-between text-sm mb-2">
                  <span class="text-surface-500">Copago</span>
                  <span class="font-semibold">{{ pricing()?.copayment ?? 0 | currencyAr }}</span>
                </div>
              }
              <div class="border-t pt-3 mt-1" style="border-color: var(--brand-primary);">
                <div class="text-xs text-surface-500 mb-1">A cobrar al paciente</div>
                <div class="text-2xl font-bold" style="color: var(--brand-primary);">{{ aCobrar() | currencyAr }}</div>
              </div>

              <div class="border-t border-surface-200 mt-3 pt-3 flex flex-col gap-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-surface-500">Asignado</span>
                  <span class="font-semibold">{{ asignado() | currencyAr }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-surface-500">{{ restante() < 0 ? 'Excedente' : 'Restante' }}</span>
                  <span class="font-semibold" [style.color]="restanteColor()">{{ (restante() < 0 ? -restante() : restante()) | currencyAr }}</span>
                </div>
              </div>

              <!-- El botón "Confirmar cobro" lo provee el [wizardFooter] del shell (mismo
                   patrón que el resto de los pasos) — ver atencion-wizard.component.ts. -->
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .fin-cobro { display: flex; flex-direction: column; gap: 1rem; max-width: 1040px; }
    .fin-cobro__sin-caja { display: flex; flex-direction: column; align-items: center; gap: .8rem; padding: 1.5rem; text-align: center; }
    .fin-cobro__ring {
      width: 64px; height: 64px; border-radius: 999px;
      background: var(--ds-success-light, #dcfce7); color: var(--ds-success, #22c55e);
      display: grid; place-items: center; font-size: 1.6rem;
    }
    .fin-cobro__exito-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; }
  `],
})
export class CobroAtencionComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly branchCtx = inject(OperatorBranchContextService);
  private readonly cajaCtx = inject(CajaContextService);

  // NOTE: Degraded from input.required<number>() / input<boolean>(false) to classic @Input()
  // decorators to work around the known vitest NG0950 bug: input.required() fires effects in
  // the constructor before setInput() assigns the value. Template is still inline per repo convention.
  // numberAttribute transform coerces the string route param (:attentionId) to a number.
  @Input({ transform: numberAttribute }) attentionId!: number;

  protected readonly METHOD_META = METHOD_META;
  protected readonly metodos = Object.keys(METHOD_META) as PaymentMethod[];

  protected readonly detail = this.store.selectSignal(selectDetail);
  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly cajaAbierta = this.store.selectSignal(selectIsCajaOpen);
  /** Públicos (no protected): el wizard los lee vía viewChild para el botón del [wizardFooter]. */
  readonly submitting = this.store.selectSignal(selectCobroSubmitting);
  readonly result = this.store.selectSignal(selectCobroResult);

  /**
   * Monto a cobrar al paciente = pricing.total (= subtotal de estudios no cubiertos + copago).
   * NO es pricing.copayment: ese campo es solo el copago manual (att.copaymentAmount), 0/null
   * en el flujo normal — usarlo dejaba el monto en $0 para pacientes particulares.
   */
  protected readonly aCobrar = computed(() => this.pricing()?.total ?? 0);

  protected readonly branchId = computed(() => this.detail()?.branchId ?? this.branchCtx.branchId());

  /**
   * KAN-156: subcaja seleccionada para imputar el efectivo del cobro. Se resuelve
   * de la selección persistida por sucursal (la pantalla de Caja la fija). Si no
   * hay caja seleccionada, el cobro queda bloqueado (no sabemos a qué caja imputar).
   */
  protected readonly cashRegisterId = computed(() => {
    const b = this.branchId();
    return b != null ? this.cajaCtx.selectedFor(b) : null;
  });

  private nextId = 1;
  protected readonly lineas = signal<LineaCobro[]>([
    { id: 0, method: 'CASH', amount: 0, reference: '' },
  ]);
  protected readonly optOutElectronic = signal(false);

  protected readonly asignado = computed(() =>
    this.lineas().reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
  protected readonly restante = computed(() => round2(this.aCobrar() - this.asignado()));
  /** Verde = cierra exacto, rojo = falta plata, ámbar = se está pagando de más. */
  protected readonly restanteColor = computed(() => {
    const r = this.restante();
    if (r === 0) return 'var(--ds-success)';
    return r > 0 ? 'var(--ds-danger)' : 'var(--ds-warning)';
  });
  /** Público: el wizard lo lee vía viewChild para deshabilitar el botón del [wizardFooter]. */
  readonly puedeConfirmar = computed(() =>
    this.cajaAbierta() && this.cashRegisterId() != null
    && this.aCobrar() > 0 && this.restante() === 0 && !this.submitting());

  /** Opciones del selector de método de pago (p-select). */
  protected readonly metodoOptions = this.metodos.map((m) => ({ label: METHOD_META[m].label, value: m }));

  constructor() {
    // Prefill: la primera (y única) línea, todavía en 0, arranca con el monto a cobrar.
    effect(() => {
      const target = this.aCobrar();
      const ls = this.lineas();
      if (target > 0 && ls.length === 1 && ls[0].amount === 0) {
        this.lineas.set([{ ...ls[0], amount: target }]);
      }
    });
    effect(() => {
      const reg = this.cashRegisterId();
      if (reg != null) this.store.dispatch(loadOpenSession({ cashRegisterId: reg }));
    });
  }

  ngOnInit(): void {
    // Limpia cualquier resultado/error de un cobro anterior antes de cargar datos del nuevo.
    // Ownership del reset: ngOnInit (montaje), no los handlers de éxito.
    this.store.dispatch(resetCobro());
    // Asegura detail + pricing para el attentionId dado.
    // Moved out of constructor effect() since attentionId is now @Input() (not a signal).
    // loadPricing se despacha siempre: el attentionId montado es autoritativo.
    // Si el store tuviera pricing de una atención diferente, quedaba dato viejo sin este fix.
    const id = this.attentionId;
    if (this.detail()?.id !== id) {
      this.store.dispatch(loadAtencion({ id }));
    }
    this.store.dispatch(loadPricing({ attentionId: id }));
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
  protected setAmount(id: number, raw: number | null): void {
    // Sin tope superior: pagar de más es válido (vuelto en efectivo, redondeo, etc.)
    // y se avisa mostrando "Restante" en amarillo — no se bloquea la carga.
    const amount = Math.max(0, raw ?? 0);
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, amount } : l));
  }
  protected setReference(id: number, reference: string): void {
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, reference } : l));
  }

  /** Público: el wizard lo invoca vía viewChild desde el botón del [wizardFooter]. */
  confirmar(): void {
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
        cashRegisterId: this.cashRegisterId(),
        totalAmount: round2(this.asignado()),
        copaymentAmount: d?.copaymentAmount ?? p.copayment,
        collections,
        details,
        operatorOptedOutOfElectronic: this.optOutElectronic(),
      },
    }));
  }

  /**
   * Tras el éxito: avanzar la atención (endBilling). El wizard auto-avanza a 'confirmar'
   * por el cambio de estado — no hay navegación acá. No se despacha resetCobro(): la
   * pantalla de éxito permanece visible hasta que el componente se desmonte (cambio de
   * step del wizard).
   */
  protected continuarTrasExito(): void {
    this.store.dispatch(endBilling({ id: this.attentionId }));
  }
  protected irACaja(): void { this.router.navigate(['/financiero/caja']); }
  protected imprimir(): void { window.print(); }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
