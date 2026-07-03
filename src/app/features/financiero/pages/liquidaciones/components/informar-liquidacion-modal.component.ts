import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InformSettlementBody } from '../../../models/liquidaciones.model';

@Component({
  selector: 'fin-informar-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Informar liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <div class="liq-form">
        <label class="liq-field">
          <span>Fecha informada <span class="pat-form__req" aria-hidden="true">*</span></span>
          <input type="date" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" data-testid="inp-fecha" />
        </label>
        <label class="liq-field">
          <span>Monto informado <span class="pat-form__req" aria-hidden="true">*</span></span>
          <input type="number" min="0" step="0.01" [ngModel]="monto()" (ngModelChange)="monto.set($event)" data-testid="inp-monto" />
        </label>
        <label class="liq-field">
          <span>Observaciones</span>
          <textarea rows="2" [ngModel]="obs()" (ngModelChange)="obs.set($event)"></textarea>
        </label>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
        <p-button label="Informar" severity="success" [disabled]="!valido()" [loading]="loading()" data-testid="btn-confirmar" (onClick)="emitir()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .liq-form { display: flex; flex-direction: column; gap: 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .liq-field input, .liq-field textarea { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
  `],
})
export class InformarLiquidacionModalComponent {
  readonly loading = signal(false);
  readonly confirm = output<InformSettlementBody>();
  readonly closed = output<void>();

  protected readonly fecha = signal<string>('');
  protected readonly monto = signal<number | null>(null);
  protected readonly obs = signal<string>('');

  protected readonly valido = computed(() => !!this.fecha() && this.monto() != null && (this.monto() ?? 0) >= 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    const body: InformSettlementBody = {
      informedDate: this.fecha(),
      informedAmount: this.monto() as number,
    };
    const obs = this.obs().trim();
    if (obs) body.observations = obs;
    this.confirm.emit(body);
  }
}
