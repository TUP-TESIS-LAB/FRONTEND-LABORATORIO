import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CashSessionStatus } from '../models/financiero.model';

@Component({
  selector: 'fin-estado-caja-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fin-estado-caja-pill" [class]="'fin-estado-caja-pill--' + status()">
      <span class="fin-estado-caja-pill__dot"></span>
      <span>{{ status() === 'OPEN' ? 'Caja abierta' : 'Caja cerrada' }}</span>
    </span>
  `,
  styles: [`
    .fin-estado-caja-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      font-size: 12.5px; font-weight: 600;
    }
    .fin-estado-caja-pill__dot {
      width: 7px; height: 7px; border-radius: 50%;
    }
    .fin-estado-caja-pill--OPEN {
      background: #e3f6ec; color: #0f8a55; border: 1px solid rgba(15,138,85,.25);
    }
    .fin-estado-caja-pill--OPEN .fin-estado-caja-pill__dot { background: #0f8a55; }
    .fin-estado-caja-pill--CLOSED {
      background: #eceef3; color: #5b6170; border: 1px solid rgba(91,97,112,.2);
    }
    .fin-estado-caja-pill--CLOSED .fin-estado-caja-pill__dot { background: #5b6170; }
  `],
})
export class EstadoCajaPillComponent {
  readonly status = input.required<CashSessionStatus>();
}
