import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { METHOD_META, PaymentMethod } from '../../../models/financiero.model';
import { RegisterCollectionBody } from '../../../models/liquidaciones.model';

@Component({
  selector: 'fin-registrar-cobro-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule, InputNumberModule, SelectModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Registrar cobro de liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <div class="liq-form">
        <label class="liq-field">
          <span>Monto cobrado <span class="pat-form__req" aria-hidden="true">*</span></span>
          <p-inputNumber mode="currency" currency="ARS" locale="es-AR" [min]="0"
                         [ngModel]="monto()" (ngModelChange)="monto.set($event)" data-testid="inp-monto-cobro" />
        </label>
        <label class="liq-field">
          <span>Medio de pago <span class="pat-form__req" aria-hidden="true">*</span></span>
          <p-select [options]="metodos" optionLabel="label" optionValue="value" appendTo="body"
                    [ngModel]="metodo()" (ngModelChange)="metodo.set($event)" data-testid="sel-metodo-cobro" />
        </label>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
        <p-button label="Registrar cobro" icon="pi pi-check" severity="success"
                  [disabled]="!valido()" [loading]="loading()" data-testid="btn-confirmar" (onClick)="emitir()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .liq-form { display: flex; flex-direction: column; gap: 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    :host ::ng-deep .liq-field .p-inputnumber { width: 100%; }
    :host ::ng-deep .liq-field .p-inputnumber .p-inputtext { width: 100%; }
    /* display:flex (no block): block rompe el flex interno de PrimeNG y el label se recorta a ~1 carácter. */
    :host ::ng-deep .liq-field .p-select { display: flex; width: 100%; }
    :host ::ng-deep .liq-field .p-select .p-select-label { flex: 1 1 auto; min-width: 0; text-overflow: ellipsis; }
  `],
})
export class RegistrarCobroLiquidacionModalComponent {
  readonly loading = signal(false);
  /** Total liquidado (con IVA) — precarga el monto cobrado; el usuario puede editarlo. */
  readonly total = input<number | null>(null);
  readonly confirm = output<RegisterCollectionBody>();
  readonly closed = output<void>();

  protected readonly monto = signal<number | null>(null);
  protected readonly metodo = signal<PaymentMethod>('TRANSFER');
  protected readonly metodos = (Object.keys(METHOD_META) as PaymentMethod[])
    .map(value => ({ value, label: METHOD_META[value].label }));

  constructor() {
    // Precarga el monto con el total de la liquidación cuando llega el input.
    effect(() => {
      const t = this.total();
      if (t != null) this.monto.set(t);
    });
  }

  protected readonly valido = computed(() => this.monto() != null && (this.monto() ?? 0) > 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    this.confirm.emit({ amount: this.monto() as number, method: this.metodo() });
  }
}
