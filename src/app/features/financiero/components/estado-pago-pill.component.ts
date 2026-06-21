import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PaymentStatus } from '../models/financiero.model';

interface StatusMeta {
  label: string;
  icon: string;
  cssClass: string;
}

const STATUS_META: Record<PaymentStatus, StatusMeta> = {
  PROCESSED: { label: 'Procesado', icon: 'pi-check-circle', cssClass: 'ep-processed' },
  CANCELLED: { label: 'Cancelado', icon: 'pi-ban',          cssClass: 'ep-cancelled' },
  CREATED:   { label: 'Pendiente', icon: 'pi-clock',        cssClass: 'ep-created'   },
};

@Component({
  selector: 'fin-estado-pago-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ep-pill" [class]="meta().cssClass">
      <i [class]="'pi ' + meta().icon"></i>
      <span>{{ meta().label }}</span>
    </span>
  `,
  styles: [`
    .ep-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 9px; border-radius: 999px;
      font-size: 12px; font-weight: 500; white-space: nowrap;
    }
    .ep-pill i { font-size: 11px; }
    .ep-processed { background: #e3f6ec; color: #0f8a55; }
    .ep-cancelled { background: #fdecea; color: #b91c1c; }
    .ep-created   { background: #f1f5f9; color: #475569; }
  `],
})
export class EstadoPagoPillComponent {
  readonly status = input.required<PaymentStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()] ?? STATUS_META['CREATED']);
}
