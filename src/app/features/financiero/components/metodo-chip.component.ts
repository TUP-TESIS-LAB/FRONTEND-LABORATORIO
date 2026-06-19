import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { METHOD_META, PaymentMethod } from '../models/financiero.model';

@Component({
  selector: 'fin-metodo-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fin-metodo-chip" [class]="'fin-metodo-chip--' + meta().color">
      <i [class]="'pi ' + meta().icon"></i>
      <span>{{ meta().label }}</span>
    </span>
  `,
  styles: [`
    .fin-metodo-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px; border-radius: 999px;
      font-size: 12px; font-weight: 500;
      border: 1px solid transparent;
    }
    .fin-metodo-chip i { font-size: 11px; }

    .fin-metodo-chip--green  { background: #e3f6ec; color: #0f8a55; border-color: rgba(15,138,85,.2); }
    .fin-metodo-chip--purple { background: #f1ecfe; color: #7a4ddb; border-color: rgba(122,77,219,.2); }
    .fin-metodo-chip--blue   { background: #e8f0ff; color: #2563eb; border-color: rgba(37,99,235,.2); }
    .fin-metodo-chip--teal   { background: #e3f6f2; color: #0f8a7d; border-color: rgba(15,138,125,.2); }
    .fin-metodo-chip--amber  { background: #fcf1dd; color: #b5740c; border-color: rgba(181,116,12,.2); }
    .fin-metodo-chip--slate  { background: #eceef3; color: #5b6170; border-color: rgba(91,97,112,.2); }
  `],
})
export class MetodoChipComponent {
  readonly metodo = input.required<PaymentMethod>();
  readonly meta = computed(() => METHOD_META[this.metodo()]);
}
