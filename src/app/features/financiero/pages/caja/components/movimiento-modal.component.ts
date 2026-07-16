import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { Store } from '@ngrx/store';
import {
  PaymentMethod, TransactionType, METHOD_META,
} from '../../../models/financiero.model';
import { registerTransaction, registerBranchMovement, loadBankAccounts } from '../../../store/financiero.actions';
import { selectBankAccounts, selectCajaSession } from '../../../store/financiero.selectors';

/**
 * Campos de detalle requeridos por método (espejo de BranchMovement.validate() del backend).
 *
 * KAN-156 (refinamiento UX 2026-06-30): el detalle por método (ID de operación, CBU/alias,
 * marca/últimos 4 de tarjeta, cuotas, terminal, lote) NO se carga a mano en un movimiento manual
 * — lo aporta el equipo (postnet) o el comprobante. Lo único que se pide es la cuenta destino en
 * TRANSFER, para no perder la traza de a qué cuenta propia entró/salió la plata.
 */
const REQUIRED_FIELDS: Record<PaymentMethod, string[]> = {
  CASH: [],
  TRANSFER: ['destinationAccountId'],
  QR: [],
  POSNET: [],
  CREDIT_CARD: [],
  DEBIT_CARD: [],
};

@Component({
  selector: 'fin-movimiento-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, Button, FormsModule, InputNumberModule, TextareaModule],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '520px' }"
      (onHide)="closed.emit()">

      <ng-template pTemplate="header">
        <div class="fin-modal__head">
          <div class="fin-modal__head-icon fin-modal__head-icon--brand">
            <i class="pi pi-dollar"></i>
          </div>
          <div>
            <h2 class="fin-modal__title">Registrar movimiento</h2>
            <p class="fin-modal__sub">
              Ingreso o egreso manual. El efectivo afecta el arqueo de la caja;
              otros medios se registran a nivel sucursal.
            </p>
          </div>
        </div>
      </ng-template>

      <div class="fin-modal__body">
        <!-- Medio de pago -->
        <div class="fin-form-field">
          <label>Medio de pago</label>
          <select class="fin-select" [ngModel]="metodo()" (ngModelChange)="setMetodo($event)" data-testid="mov-metodo">
            @for (m of metodos; track m) {
              <option [value]="m">{{ METHOD_META[m].label }}</option>
            }
          </select>
          @if (esEfectivo()) {
            <small class="fin-hint"><i class="pi pi-info-circle"></i> Afecta el saldo arqueable de la caja seleccionada.</small>
          } @else {
            <small class="fin-hint"><i class="pi pi-info-circle"></i> No suma al efectivo del cajón. Queda en "Otros medios" de la sucursal.</small>
          }
        </div>

        <!-- Tipo segmentado -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Tipo de movimiento</label>
          <div class="fin-seg">
            <button class="fin-seg__btn" [class.fin-seg__btn--ingreso]="tipo() === 'INGRESS'"
                    type="button" (click)="tipo.set('INGRESS')">
              <i class="pi pi-arrow-down-left"></i> Ingreso
            </button>
            <button class="fin-seg__btn" [class.fin-seg__btn--egreso]="tipo() === 'EGRESS'"
                    type="button" (click)="tipo.set('EGRESS')">
              <i class="pi pi-arrow-up-right"></i> Egreso
            </button>
          </div>
        </div>

        <!-- Monto -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Monto <span class="fin-req">obligatorio</span></label>
          <div class="fin-big-input">
            <span class="fin-big-input__prefix">$</span>
            <p-inputNumber [ngModel]="monto()" (ngModelChange)="monto.set($event)"
              [min]="0" [minFractionDigits]="2" [maxFractionDigits]="2" placeholder="0,00" [autofocus]="true" data-testid="mov-monto" />
          </div>
        </div>

        <!-- Descripción -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Descripción <span class="fin-req">obligatorio</span></label>
          <textarea pTextarea [ngModel]="descripcion()" (ngModelChange)="descripcion.set($event)"
            rows="2" style="width:100%" placeholder="Ej.: aporte de cambio / retiro para insumos"></textarea>
        </div>

        <!-- Cuenta destino: solo TRANSFER, obligatoria (KAN-156). El resto de medios
             no-efectivo (QR, tarjetas, posnet) no pide detalle: el equipo lo aporta. -->
        @if (metodo() === 'TRANSFER') {
          <div class="fin-method-fields">
            <div class="fin-form-field">
              <label>Cuenta destino <span class="fin-req">obligatorio</span></label>
              <select class="fin-select" [ngModel]="destinationAccountId()" (ngModelChange)="setDestino($event)" data-testid="mov-cuenta">
                <option [ngValue]="null">— Elegí una cuenta —</option>
                @for (a of cuentas(); track a.id) {
                  <option [ngValue]="a.id">{{ a.label }}{{ a.banco ? ' · ' + a.banco : '' }}</option>
                }
              </select>
              @if (cuentas().length === 0) {
                <small class="fin-hint">No hay cuentas destino activas. Un administrador puede crearlas en "Cuentas destino".</small>
              }
            </div>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="fin-modal__footer">
          <p-button label="Cancelar" severity="secondary" (onClick)="closed.emit()" />
          <p-button
            [label]="tipo() === 'INGRESS' ? 'Registrar ingreso' : 'Registrar egreso'"
            [severity]="tipo() === 'INGRESS' ? 'success' : 'danger'"
            [disabled]="!canConfirm()"
            (onClick)="confirm()"
            data-testid="mov-confirmar" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .fin-modal__head { display: flex; align-items: center; gap: 14px; }
    .fin-modal__head-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .fin-modal__head-icon--brand { background: #eef0ff; color: #4b4ddb; }
    .fin-modal__title { margin: 0; font-size: 18px; font-weight: 700; color: #22243a; }
    .fin-modal__sub   { margin: 2px 0 0; font-size: 13px; color: #7c8092; }

    .fin-modal__body { padding: 4px 0; display: flex; flex-direction: column; }
    .fin-modal__footer { display: flex; justify-content: flex-end; gap: 10px; }

    .fin-form-field { display: flex; flex-direction: column; gap: 6px; }
    .fin-form-field label { font-size: 13.5px; font-weight: 600; color: #22243a; }
    .fin-req { font-size: 11px; color: #d83a3a; font-weight: 400; margin-left: 4px; }
    .fin-hint { font-size: 12px; color: #7c8092; display: flex; align-items: center; gap: 5px; }

    .fin-select, .fin-input {
      border: 1.5px solid #e8e9f0; border-radius: 8px; padding: 9px 12px;
      font-size: 14px; color: #22243a; background: white; width: 100%;
    }

    .fin-method-fields {
      margin-top: 14px; padding-top: 14px; border-top: 1px dashed #e8e9f0;
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .fin-method-fields > .fin-form-field:first-child { grid-column: 1 / -1; }

    .fin-seg { display: flex; border: 1.5px solid #e8e9f0; border-radius: 10px; overflow: hidden; }
    .fin-seg__btn {
      flex: 1; padding: 10px 16px; border: none; background: white; cursor: pointer;
      font-size: 14px; font-weight: 500; color: #7c8092;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background 120ms, color 120ms;
    }
    .fin-seg__btn + .fin-seg__btn { border-left: 1px solid #e8e9f0; }
    .fin-seg__btn--ingreso { background: #e3f6ec; color: #0f8a55; }
    .fin-seg__btn--egreso  { background: #fdebeb; color: #d83a3a; }

    .fin-big-input {
      display: flex; align-items: center;
      border: 1.5px solid #e8e9f0; border-radius: 10px;
      background: white; overflow: hidden;
    }
    .fin-big-input__prefix {
      padding: 0 14px; font-size: 22px; font-weight: 700;
      color: #7c8092; border-right: 1px solid #e8e9f0;
    }
    :host ::ng-deep .fin-big-input .p-inputtext {
      border: none !important; box-shadow: none !important;
      font-size: 26px; font-weight: 700; font-family: 'Roboto Mono', monospace;
      color: #22243a; flex: 1; padding: 12px 16px;
    }
  `],
})
export class MovimientoModalComponent implements OnInit {
  /** Subcaja seleccionada (para efectivo). Puede ser null si no hay caja abierta. */
  readonly cashRegisterId = input<number | null>(null);
  /** Sucursal (para movimientos no-efectivo). */
  readonly branchId = input.required<number>();
  readonly closed = output<void>();

  private readonly store = inject(Store);

  protected readonly METHOD_META = METHOD_META;
  protected readonly metodos = Object.keys(METHOD_META) as PaymentMethod[];
  protected readonly cuentas = this.store.selectSignal(selectBankAccounts);
  private readonly session = this.store.selectSignal(selectCajaSession);

  protected metodo = signal<PaymentMethod>('CASH');
  protected tipo = signal<TransactionType>('INGRESS');
  // null = campo vacío (muestra placeholder), no "0,00" que haya que borrar para escribir.
  protected monto = signal<number | null>(null);
  protected descripcion = signal('');

  /** Único detalle que se carga a mano: cuenta destino (obligatoria solo en TRANSFER). */
  protected destinationAccountId = signal<number | null>(null);

  protected readonly esEfectivo = computed(() => this.metodo() === 'CASH');

  ngOnInit(): void {
    this.store.dispatch(loadBankAccounts());
  }

  protected setMetodo(m: PaymentMethod): void {
    this.metodo.set(m);
  }
  protected setDestino(id: number | null): void {
    this.destinationAccountId.set(id);
  }

  protected readonly canConfirm = computed(() => {
    if ((this.monto() ?? 0) <= 0 || this.descripcion().trim().length === 0) return false;
    if (this.esEfectivo()) return this.cashRegisterId() != null;
    // no-efectivo: el único campo requerido es la cuenta destino, y solo en TRANSFER.
    return REQUIRED_FIELDS[this.metodo()].includes('destinationAccountId')
      ? this.destinationAccountId() != null
      : true;
  });

  protected confirm(): void {
    if (!this.canConfirm()) return;
    const monto = this.monto() ?? 0; // canConfirm ya garantizó > 0

    if (this.esEfectivo()) {
      const cashRegisterId = this.cashRegisterId();
      const sess = this.session();
      // Efectivo requiere sesión OPEN (C11). El path usa el id de sesión; el
      // backend resuelve la caja por cashRegisterId del body (ADR-6).
      if (cashRegisterId == null || sess == null) return;
      this.store.dispatch(registerTransaction({
        id: sess.id,
        body: {
          cashRegisterId,
          type: this.tipo(),
          amount: monto,
          description: this.descripcion().trim(),
        },
      }));
      this.closed.emit();
      return;
    }

    // no-efectivo → branch movement. Solo monto + descripción (+ cuenta destino en TRANSFER);
    // el detalle por método (KAN-156) ya no se carga a mano.
    this.store.dispatch(registerBranchMovement({
      body: {
        branchId: this.branchId(),
        type: this.tipo(),
        method: this.metodo(),
        amount: monto,
        description: this.descripcion().trim() || null,
        destinationAccountId: this.destinationAccountId(),
      },
    }));
    this.closed.emit();
  }
}
