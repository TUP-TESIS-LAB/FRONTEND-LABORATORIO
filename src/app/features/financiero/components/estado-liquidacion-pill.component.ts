import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SettlementStatus, SETTLEMENT_STATUS_LABELS } from '../models/liquidaciones.model';

@Component({
  selector: 'fin-estado-liquidacion-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="liq-pill" [class]="'liq-pill--' + status()">{{ label() }}</span>`,
  styles: [`
    .liq-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .liq-pill--PENDING   { background: #fcf1dd; color: #b5740c; }
    .liq-pill--INFORMED  { background: #e0effe; color: #1d4ed8; }
    .liq-pill--BILLED    { background: #e3f6ec; color: #0f8a55; }
    .liq-pill--CANCELLED { background: #f1f5f9; color: #64748b; }
  `],
})
export class EstadoLiquidacionPillComponent {
  readonly status = input.required<SettlementStatus>();
  protected readonly label = computed(() => SETTLEMENT_STATUS_LABELS[this.status()]);
}
