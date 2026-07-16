import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SettlementStatus, SETTLEMENT_STATUS_LABELS } from '../models/liquidaciones.model';

/** Íconos por estado (PrimeIcons; nunca solo color — regla A11y del DS). */
const STATUS_ICON: Record<SettlementStatus, string> = {
  PENDING: 'pi-clock',
  INFORMED: 'pi-send',
  BILLED: 'pi-check-circle',
  CANCELLED: 'pi-ban',
};

@Component({
  selector: 'fin-estado-liquidacion-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="liq-pill" [class]="'liq-pill--' + status()"><i class="pi" [class]="icon()"></i>{{ label() }}</span>`,
  styles: [`
    .liq-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.4; }
    .liq-pill i { font-size: 11px; }
    .liq-pill--PENDING   { background: color-mix(in srgb, var(--ds-warning) 16%, white); color: color-mix(in srgb, var(--ds-warning) 78%, black); }
    .liq-pill--INFORMED  { background: color-mix(in srgb, var(--ds-info) 14%, white);    color: color-mix(in srgb, var(--ds-info) 74%, black); }
    .liq-pill--BILLED    { background: color-mix(in srgb, var(--ds-success) 16%, white); color: color-mix(in srgb, var(--ds-success) 66%, black); }
    .liq-pill--CANCELLED { background: var(--ds-surface); color: var(--ds-text-muted); }
  `],
})
export class EstadoLiquidacionPillComponent {
  readonly status = input.required<SettlementStatus>();
  protected readonly label = computed(() => SETTLEMENT_STATUS_LABELS[this.status()]);
  protected readonly icon = computed(() => STATUS_ICON[this.status()]);
}
