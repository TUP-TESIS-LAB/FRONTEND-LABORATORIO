import { ChangeDetectionStrategy, Component, inject, Input, numberAttribute, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { loadPricing } from '@features/analitica/store/atencion/atencion.actions';
import { selectPricing } from '@features/analitica/store/atencion/atencion.selectors';

@Component({
  selector: 'lab-cobro-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe],
  template: `
    <div class="aw-step p-2">
      <h3 class="text-lg font-semibold mb-3">Cobro</h3>
      <p class="text-sm opacity-70 mb-4">Revisá el desglose. Al continuar, pasás a la facturación y el registro del cobro.</p>
      <div class="max-w-md flex flex-col gap-1">
        <div class="flex justify-between py-1"><span>Estudios a cargo del paciente</span><b>{{ pricing()?.subtotal ?? 0 | currencyAr }}</b></div>
        @if ((pricing()?.copayment ?? 0) > 0) {
          <div class="flex justify-between py-1"><span>Copago</span><b>{{ pricing()?.copayment ?? 0 | currencyAr }}</b></div>
        }
        <div class="flex justify-between py-1 border-t border-gray-200 text-base"><span>A cobrar al paciente</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
      </div>
    </div>
  `,
})
export class CobroStepComponent implements OnInit {
  private readonly store = inject(Store);

  @Input({ transform: numberAttribute }) atencionId!: number;

  protected readonly pricing = this.store.selectSignal(selectPricing);

  ngOnInit(): void {
    // El attentionId montado es autoritativo: se despacha siempre para no mostrar
    // pricing de una atención diferente que pudiera quedar en el store.
    // ngOnInit garantiza que @Input() ya tiene el valor asignado (no el constructor).
    this.store.dispatch(loadPricing({ attentionId: this.atencionId }));
  }
}
