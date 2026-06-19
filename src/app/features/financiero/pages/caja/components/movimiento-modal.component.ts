import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { Store } from '@ngrx/store';
import { TransactionType } from '../../../models/financiero.model';
import { registerTransaction } from '../../../store/financiero.actions';
import { selectCajaSession } from '../../../store/financiero.selectors';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

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
      [style]="{ width: '480px' }"
      (onHide)="closed.emit()">

      <ng-template pTemplate="header">
        <div class="fin-modal__head">
          <div class="fin-modal__head-icon fin-modal__head-icon--brand">
            <i class="pi pi-dollar"></i>
          </div>
          <div>
            <h2 class="fin-modal__title">Registrar movimiento</h2>
            <p class="fin-modal__sub">Ingreso o egreso manual de efectivo en la caja.</p>
          </div>
        </div>
      </ng-template>

      <div class="fin-modal__body">
        <!-- Tipo segmentado -->
        <div class="fin-form-field">
          <label>Tipo de movimiento</label>
          <div class="fin-seg">
            <button
              class="fin-seg__btn"
              [class.fin-seg__btn--ingreso]="tipo() === 'INGRESS'"
              type="button"
              (click)="tipo.set('INGRESS')">
              <i class="pi pi-arrow-down-left"></i> Ingreso
            </button>
            <button
              class="fin-seg__btn"
              [class.fin-seg__btn--egreso]="tipo() === 'EGRESS'"
              type="button"
              (click)="tipo.set('EGRESS')">
              <i class="pi pi-arrow-up-right"></i> Egreso
            </button>
          </div>
        </div>

        <!-- Monto -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Monto <span class="fin-req">obligatorio</span></label>
          <div class="fin-big-input">
            <span class="fin-big-input__prefix">$</span>
            <p-inputNumber
              [ngModel]="monto()" (ngModelChange)="monto.set($event)"
              [min]="0"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              placeholder="0,00"
              [autofocus]="true" />
          </div>
        </div>

        <!-- Descripción -->
        <div class="fin-form-field" style="margin-top:14px">
          <label>Descripción <span class="fin-req">obligatorio</span></label>
          <textarea
            pTextarea
            [ngModel]="descripcion()" (ngModelChange)="descripcion.set($event)"
            rows="3"
            style="width:100%"
            [placeholder]="tipo() === 'INGRESS'
              ? 'Ej.: aporte de cambio para el turno'
              : 'Ej.: retiro para insumos de extracción'">
          </textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="fin-modal__footer">
          <p-button label="Cancelar" severity="secondary" (onClick)="closed.emit()" />
          <p-button
            [label]="tipo() === 'INGRESS' ? 'Registrar ingreso' : 'Registrar egreso'"
            [severity]="tipo() === 'INGRESS' ? 'success' : 'danger'"
            [disabled]="!canConfirm()"
            (onClick)="confirm()" />
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

    .fin-seg {
      display: flex; border: 1.5px solid #e8e9f0; border-radius: 10px; overflow: hidden;
    }
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
export class MovimientoModalComponent {
  readonly closed = output<void>();

  private readonly store = inject(Store);
  private readonly branchCtx = inject(OperatorBranchContextService);
  private readonly session = this.store.selectSignal(selectCajaSession);

  protected tipo = signal<TransactionType>('INGRESS');
  protected monto = signal(0);
  protected descripcion = signal('');

  protected readonly canConfirm = computed(
    () => this.monto() > 0 && this.descripcion().trim().length > 0,
  );

  protected confirm(): void {
    const sess = this.session();
    const branchId = this.branchCtx.branchId();
    if (!sess || !branchId || !this.canConfirm()) return;

    this.store.dispatch(
      registerTransaction({
        id: sess.id,
        body: {
          branchId,
          type: this.tipo(),
          amount: this.monto(),
          description: this.descripcion().trim(),
        },
      }),
    );
    this.closed.emit();
  }
}
