import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { Payment } from '../../../models/financiero.model';

@Component({
  selector: 'fin-cancelar-pago-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, FormsModule, Button, CurrencyArPipe],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '520px' }"
      header="Cancelar pago"
      (onHide)="closed.emit()">

      @if (payment()) {
        <div class="cpm-body">
          <!-- ícono + advertencia -->
          <div class="cpm-warn">
            <div class="cpm-warn-ico"><i class="pi pi-ban"></i></div>
            <p class="cpm-warn-txt">
              Se genera una reversa en la caja y se anula el comprobante asociado.
              <strong>Esta acción no se puede deshacer.</strong>
            </p>
          </div>

          <!-- resumen del pago -->
          <div class="cpm-summary">
            <div class="cpm-row">
              <span class="cpm-lbl">Pago</span>
              <span class="cpm-val">#{{ payment()!.id }}</span>
            </div>
            <div class="cpm-row">
              <span class="cpm-lbl">Monto a revertir</span>
              <span class="cpm-val cpm-strong">{{ payment()!.copaymentAmount | currencyAr }}</span>
            </div>
          </div>

          <!-- motivo -->
          <div class="cpm-field">
            <label for="cpm-motivo" class="cpm-label">
              Motivo de la cancelación
              <span class="cpm-req">obligatorio</span>
            </label>
            <textarea
              id="cpm-motivo"
              class="cpm-textarea"
              rows="3"
              [(ngModel)]="reason"
              placeholder="Ej.: cobro duplicado — el paciente ya había abonado en otra caja.">
            </textarea>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button
            label="Volver"
            severity="secondary"
            [text]="true"
            (onClick)="closed.emit()" />
          <p-button
            label="Cancelar pago y anular comprobante"
            severity="danger"
            icon="pi pi-ban"
            [disabled]="!canConfirm()"
            (onClick)="onConfirm()" />
        </ng-template>
      }
    </p-dialog>
  `,
  styles: [`
    .cpm-body { display: flex; flex-direction: column; gap: 16px; }

    .cpm-warn {
      display: flex; align-items: flex-start; gap: 12px;
      background: #fdecea; border-radius: 8px; padding: 12px 14px;
    }
    .cpm-warn-ico {
      font-size: 18px; color: #b91c1c; flex-shrink: 0; margin-top: 1px;
    }
    .cpm-warn-txt { font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.5; }

    .cpm-summary {
      display: flex; flex-direction: column; gap: 8px;
      background: #f8fafc; border: 1px solid #e8edf3;
      border-radius: 8px; padding: 12px 14px;
    }
    .cpm-row   { display: flex; justify-content: space-between; font-size: 13px; }
    .cpm-lbl   { color: var(--ds-text-muted, #6b7280); }
    .cpm-val   { color: var(--ds-text, #1a1a2e); font-weight: 500; }
    .cpm-strong { color: #b91c1c; }

    .cpm-field { display: flex; flex-direction: column; gap: 6px; }
    .cpm-label { font-size: 13px; font-weight: 500; color: var(--ds-text, #1a1a2e); }
    .cpm-req   { font-size: 11px; color: #b91c1c; margin-left: 6px; font-weight: 400; }
    .cpm-textarea {
      width: 100%; box-sizing: border-box;
      padding: 8px 10px; font-size: 13px; border-radius: 6px;
      border: 1px solid #cbd5e1; resize: vertical; font-family: inherit;
      outline: none; transition: border-color 150ms;
    }
    .cpm-textarea:focus { border-color: var(--p-primary-color, #4f46e5); }
  `],
})
export class CancelarPagoModalComponent {
  readonly visible = input<boolean>(false);
  readonly payment = input<Payment | null>(null);

  readonly closed    = output<void>();
  readonly confirmed = output<string>();

  protected readonly reason = signal('');

  protected readonly canConfirm = computed(() => this.reason().trim().length > 0);

  protected onConfirm(): void {
    if (!this.canConfirm()) return;
    this.confirmed.emit(this.reason().trim());
    this.reason.set('');
  }
}
