import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CancelSettlementBody } from '../../../models/liquidaciones.model';

@Component({
  selector: 'fin-anular-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Anular liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <p class="liq-warn">Esta acción no se puede deshacer. Las prestaciones vuelven a quedar pendientes.</p>
      <label class="liq-field">
        <span>Motivo de la anulación <span class="pat-form__req" aria-hidden="true">*</span></span>
        <textarea rows="3" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)" data-testid="inp-motivo"></textarea>
      </label>
      <ng-template pTemplate="footer">
        <p-button label="Volver" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
        <p-button label="Anular liquidación" severity="danger" [disabled]="!valido()" [loading]="loading()" data-testid="btn-confirmar" (onClick)="emitir()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .liq-warn { font-size: 13px; color: #b5740c; background: #fcf1dd; padding: 8px 12px; border-radius: 7px; margin: 0 0 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .liq-field textarea { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
  `],
})
export class AnularLiquidacionModalComponent {
  readonly loading = signal(false);
  readonly confirm = output<CancelSettlementBody>();
  readonly closed = output<void>();

  protected readonly motivo = signal<string>('');
  protected readonly valido = computed(() => this.motivo().trim().length > 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    this.confirm.emit({ cancellationReason: this.motivo().trim() });
  }
}
