import { ChangeDetectionStrategy, Component, effect, inject, Input, numberAttribute, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { InputNumberModule } from 'primeng/inputnumber';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { loadPricing, setCopayment } from '@features/analitica/store/atencion/atencion.actions';
import { selectCopaymentMutating, selectPricing } from '@features/analitica/store/atencion/atencion.selectors';

@Component({
  selector: 'lab-cobro-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, FormsModule, InputNumberModule],
  template: `
    <div class="aw-step p-2">
      <h3 class="text-lg font-semibold mb-3">Cobro</h3>
      <p class="text-sm opacity-70 mb-4">Cargá el copago del paciente. Al continuar, pasás a la facturación y el registro del cobro.</p>
      <div class="max-w-md flex flex-col gap-1">
        <div class="flex justify-between py-1"><span>Estudios a cargo del paciente</span><b>{{ pricing()?.subtotal ?? 0 | currencyAr }}</b></div>
        <div class="flex items-center justify-between py-1">
          <label class="opacity-80" for="copago-input">Copago</label>
          <p-inputNumber
            inputId="copago-input"
            [ngModel]="copaymentValue()"
            (ngModelChange)="copaymentValue.set($event)"
            (onBlur)="onCopaymentBlur()"
            mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0"
            [disabled]="copaymentMutating()"
            inputStyleClass="w-32 text-right" placeholder="0,00" />
        </div>
        <div class="flex justify-between py-1 border-t border-gray-200 text-base"><span>A cobrar al paciente</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
      </div>
    </div>
  `,
})
export class CobroStepComponent implements OnInit {
  private readonly store = inject(Store);

  @Input({ transform: numberAttribute }) atencionId!: number;

  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly copaymentMutating = this.store.selectSignal(selectCopaymentMutating);
  protected readonly copaymentValue = signal<number | null>(null);

  constructor() {
    // Inicializa/sincroniza el input con el copago persistido (reflejado en pricing.copayment).
    let seeded = false;
    effect(() => {
      const p = this.pricing();
      if (!seeded && p) { this.copaymentValue.set(p.copayment ?? null); seeded = true; }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadPricing({ attentionId: this.atencionId }));
  }

  onCopaymentBlur(): void {
    const amount = this.copaymentValue();
    const current = this.pricing()?.copayment ?? null;
    if (amount === current) return;
    this.store.dispatch(setCopayment({ attentionId: this.atencionId, copaymentAmount: amount }));
  }
}
