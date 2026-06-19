import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Store } from '@ngrx/store';
import { openSession } from '../../../store/financiero.actions';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

@Component({
  selector: 'fin-abrir-caja-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, Button, FormsModule, InputNumberModule, CurrencyArPipe],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="fin-modal"
      [style]="{ width: '440px' }"
      header="Abrir caja"
      (onHide)="closed.emit()">

      <ng-template pTemplate="header">
        <div class="fin-modal__head">
          <div class="fin-modal__head-icon fin-modal__head-icon--green">
            <i class="pi pi-lock-open"></i>
          </div>
          <div>
            <h2 class="fin-modal__title">Abrir caja</h2>
            <p class="fin-modal__sub">Contá el efectivo inicial del cajón y declaralo.</p>
          </div>
        </div>
      </ng-template>

      <div class="fin-modal__body">
        <div class="fin-form-field">
          <label>Monto de apertura <span class="fin-req">obligatorio</span></label>
          <div class="fin-big-input">
            <span class="fin-big-input__prefix">$</span>
            <p-inputNumber
              [(ngModel)]="montoApertura"
              [min]="0"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              placeholder="0,00"
              inputStyleClass="fin-big-input__field"
              [autofocus]="true" />
          </div>
          <small class="fin-hint">
            Es el efectivo con el que arranca el turno. Queda registrado como saldo inicial del arqueo.
          </small>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="fin-modal__footer">
          <p-button label="Cancelar" severity="secondary" (onClick)="closed.emit()" />
          <p-button
            [label]="'Abrir caja con ' + (montoApertura | currencyAr)"
            severity="success"
            icon="pi pi-lock-open"
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
    .fin-modal__head-icon--green { background: #e3f6ec; color: #0f8a55; }
    .fin-modal__title { margin: 0; font-size: 18px; font-weight: 700; color: #22243a; }
    .fin-modal__sub   { margin: 2px 0 0; font-size: 13px; color: #7c8092; }

    .fin-modal__body { padding: 4px 0; }
    .fin-modal__footer { display: flex; justify-content: flex-end; gap: 10px; }

    .fin-form-field { display: flex; flex-direction: column; gap: 6px; }
    .fin-form-field label { font-size: 13.5px; font-weight: 600; color: #22243a; }
    .fin-req { font-size: 11px; color: #d83a3a; font-weight: 400; margin-left: 4px; }

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
    .fin-hint { font-size: 12.5px; color: #7c8092; }
  `],
})
export class AbrirCajaModalComponent {
  readonly closed = output<void>();

  private readonly store = inject(Store);
  private readonly branchCtx = inject(OperatorBranchContextService);

  protected montoApertura = 0;
  protected readonly canConfirm = computed(() => this.montoApertura > 0);

  protected confirm(): void {
    const branchId = this.branchCtx.branchId();
    if (!branchId || this.montoApertura <= 0) return;
    this.store.dispatch(openSession({ branchId, openingAmount: this.montoApertura }));
    this.closed.emit();
  }
}
