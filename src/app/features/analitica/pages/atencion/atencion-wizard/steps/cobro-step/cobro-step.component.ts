import { ChangeDetectionStrategy, Component, effect, inject, Input, numberAttribute } from '@angular/core';
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
        <div class="flex justify-between py-1"><span>Total de estudios</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
        <div class="flex justify-between py-1"><span>Cubierto por obra social</span><b>{{ cubierto() | currencyAr }}</b></div>
        <div class="flex justify-between py-1 border-t border-gray-200 text-base"><span>A cobrar al paciente</span><b>{{ pricing()?.copayment ?? 0 | currencyAr }}</b></div>
      </div>
    </div>
  `,
})
export class CobroStepComponent {
  private readonly store = inject(Store);

  @Input({ transform: numberAttribute }) atencionId!: number;

  protected readonly pricing = this.store.selectSignal(selectPricing);

  protected cubierto(): number {
    const p = this.pricing();
    return p ? Math.max(0, p.total - p.copayment) : 0;
  }

  constructor() {
    effect(() => {
      const id = this.atencionId;
      if (id != null && !this.pricing()) {
        this.store.dispatch(loadPricing({ attentionId: id }));
      }
    });
  }
}
