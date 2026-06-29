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

/** Campos de detalle requeridos por método (espejo de BranchMovement.validate() del backend). */
const REQUIRED_FIELDS: Record<PaymentMethod, string[]> = {
  CASH: [],
  TRANSFER: ['transactionId', 'senderName', 'senderCbuAlias', 'destinationAccountId'],
  QR: ['transactionId'],
  POSNET: ['terminalId'],
  CREDIT_CARD: ['transactionId', 'cardBrand', 'lastFourDigits'],
  DEBIT_CARD: ['transactionId', 'cardBrand', 'lastFourDigits'],
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
              [min]="0" [minFractionDigits]="2" [maxFractionDigits]="2" placeholder="0,00" [autofocus]="true" />
          </div>
        </div>

        <!-- Descripción -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Descripción <span class="fin-req">obligatorio</span></label>
          <textarea pTextarea [ngModel]="descripcion()" (ngModelChange)="descripcion.set($event)"
            rows="2" style="width:100%" placeholder="Ej.: aporte de cambio / retiro para insumos"></textarea>
        </div>

        <!-- Campos por método (no-efectivo) -->
        @if (!esEfectivo()) {
          <div class="fin-method-fields">
            <!-- Cuenta destino -->
            <div class="fin-form-field">
              <label>
                Cuenta destino
                @if (req('destinationAccountId')) { <span class="fin-req">obligatorio</span> }
              </label>
              <select class="fin-select" [ngModel]="destinationAccountId()" (ngModelChange)="setDestino($event)" data-testid="mov-cuenta">
                <option [ngValue]="null">— Sin cuenta destino —</option>
                @for (a of cuentas(); track a.id) {
                  <option [ngValue]="a.id">{{ a.label }}{{ a.banco ? ' · ' + a.banco : '' }}</option>
                }
              </select>
              @if (cuentas().length === 0) {
                <small class="fin-hint">No hay cuentas destino activas. Un administrador puede crearlas en "Cuentas destino".</small>
              }
            </div>

            @if (showField('transactionId')) {
              <div class="fin-form-field">
                <label>ID de operación @if (req('transactionId')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="transactionId()" (ngModelChange)="transactionId.set($event)" maxlength="120" />
              </div>
            }
            @if (showField('senderName')) {
              <div class="fin-form-field">
                <label>Titular que transfiere @if (req('senderName')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="senderName()" (ngModelChange)="senderName.set($event)" maxlength="160" />
              </div>
            }
            @if (showField('senderCbuAlias')) {
              <div class="fin-form-field">
                <label>CBU / alias de origen @if (req('senderCbuAlias')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="senderCbuAlias()" (ngModelChange)="senderCbuAlias.set($event)" maxlength="120" />
              </div>
            }
            @if (showField('cardBrand')) {
              <div class="fin-form-field">
                <label>Marca de tarjeta @if (req('cardBrand')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="cardBrand()" (ngModelChange)="cardBrand.set($event)" maxlength="40" placeholder="Visa, Mastercard…" />
              </div>
            }
            @if (showField('lastFourDigits')) {
              <div class="fin-form-field">
                <label>Últimos 4 dígitos @if (req('lastFourDigits')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="lastFourDigits()" (ngModelChange)="lastFourDigits.set($event)" maxlength="4" inputmode="numeric" />
              </div>
            }
            @if (showField('installments')) {
              <div class="fin-form-field">
                <label>Cuotas</label>
                <input class="fin-input" type="number" min="1" [ngModel]="installments()" (ngModelChange)="installments.set($event)" />
              </div>
            }
            @if (showField('terminalId')) {
              <div class="fin-form-field">
                <label>Terminal / Posnet @if (req('terminalId')) { <span class="fin-req">obligatorio</span> }</label>
                <input class="fin-input" [ngModel]="terminalId()" (ngModelChange)="terminalId.set($event)" maxlength="60" />
              </div>
            }
            @if (showField('batchNumber')) {
              <div class="fin-form-field">
                <label>N° de lote</label>
                <input class="fin-input" [ngModel]="batchNumber()" (ngModelChange)="batchNumber.set($event)" maxlength="60" />
              </div>
            }
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
  protected monto = signal(0);
  protected descripcion = signal('');

  // detalle no-efectivo
  protected destinationAccountId = signal<number | null>(null);
  protected transactionId = signal('');
  protected senderName = signal('');
  protected senderCbuAlias = signal('');
  protected cardBrand = signal('');
  protected lastFourDigits = signal('');
  protected installments = signal<number | null>(null);
  protected terminalId = signal('');
  protected batchNumber = signal('');

  protected readonly esEfectivo = computed(() => this.metodo() === 'CASH');

  ngOnInit(): void {
    this.store.dispatch(loadBankAccounts());
  }

  protected req(field: string): boolean {
    return REQUIRED_FIELDS[this.metodo()].includes(field);
  }

  /** Qué campos mostrar por método (incluye opcionales). */
  protected showField(field: string): boolean {
    const m = this.metodo();
    const optional: Record<string, PaymentMethod[]> = {
      transactionId: ['TRANSFER', 'QR', 'CREDIT_CARD', 'DEBIT_CARD'],
      senderName: ['TRANSFER'],
      senderCbuAlias: ['TRANSFER'],
      cardBrand: ['CREDIT_CARD', 'DEBIT_CARD'],
      lastFourDigits: ['CREDIT_CARD', 'DEBIT_CARD'],
      installments: ['CREDIT_CARD'],
      terminalId: ['POSNET'],
      batchNumber: ['POSNET'],
    };
    return (optional[field] ?? []).includes(m);
  }

  protected setMetodo(m: PaymentMethod): void {
    this.metodo.set(m);
  }
  protected setDestino(id: number | null): void {
    this.destinationAccountId.set(id);
  }

  protected readonly canConfirm = computed(() => {
    if (this.monto() <= 0 || this.descripcion().trim().length === 0) return false;
    if (this.esEfectivo()) return this.cashRegisterId() != null;
    // no-efectivo: validar campos requeridos del método
    const values: Record<string, string | number | null> = {
      destinationAccountId: this.destinationAccountId(),
      transactionId: this.transactionId().trim(),
      senderName: this.senderName().trim(),
      senderCbuAlias: this.senderCbuAlias().trim(),
      cardBrand: this.cardBrand().trim(),
      lastFourDigits: this.lastFourDigits().trim(),
      terminalId: this.terminalId().trim(),
    };
    return REQUIRED_FIELDS[this.metodo()].every(f => {
      const v = values[f];
      return v !== null && v !== undefined && v !== '';
    });
  });

  protected confirm(): void {
    if (!this.canConfirm()) return;

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
          amount: this.monto(),
          description: this.descripcion().trim(),
        },
      }));
      this.closed.emit();
      return;
    }

    // no-efectivo → branch movement
    this.store.dispatch(registerBranchMovement({
      body: {
        branchId: this.branchId(),
        type: this.tipo(),
        method: this.metodo(),
        amount: this.monto(),
        description: this.descripcion().trim() || null,
        destinationAccountId: this.destinationAccountId(),
        transactionId: this.nullable(this.transactionId()),
        senderName: this.nullable(this.senderName()),
        senderCbuAlias: this.nullable(this.senderCbuAlias()),
        cardBrand: this.nullable(this.cardBrand()),
        lastFourDigits: this.nullable(this.lastFourDigits()),
        installments: this.installments(),
        terminalId: this.nullable(this.terminalId()),
        batchNumber: this.nullable(this.batchNumber()),
      },
    }));
    this.closed.emit();
  }

  private nullable(v: string): string | null {
    const t = v.trim();
    return t.length ? t : null;
  }
}
