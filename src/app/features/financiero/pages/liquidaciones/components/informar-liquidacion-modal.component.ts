import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InformSettlementBody } from '../../../models/liquidaciones.model';

function toIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'fin-informar-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule, DatePickerModule, InputNumberModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Informar liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <div class="liq-form">
        <label class="liq-field">
          <span>Fecha informada <span class="pat-form__req" aria-hidden="true">*</span></span>
          <p-datePicker dateFormat="dd/mm/yy" appendTo="body" [showIcon]="true" [maxDate]="hoy"
                        [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" data-testid="inp-fecha" />
        </label>
        <label class="liq-field">
          <span>Monto informado <span class="pat-form__req" aria-hidden="true">*</span></span>
          <p-inputNumber mode="currency" currency="ARS" locale="es-AR" [min]="0"
                         [ngModel]="monto()" (ngModelChange)="monto.set($event)" data-testid="inp-monto" />
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
    .liq-field textarea { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
    :host ::ng-deep .liq-field .p-datepicker,
    :host ::ng-deep .liq-field .p-inputnumber { width: 100%; }
    :host ::ng-deep .liq-field .p-datepicker .p-inputtext,
    :host ::ng-deep .liq-field .p-inputnumber .p-inputtext { width: 100%; }
  `],
})
export class InformarLiquidacionModalComponent {
  readonly loading = signal(false);
  /** Total liquidado (neto) — precarga el monto informado; el usuario puede editarlo. */
  readonly total = input<number | null>(null);
  readonly confirm = output<InformSettlementBody>();
  readonly closed = output<void>();

  /** Tope de fecha: hoy — no se puede informar en el futuro. */
  protected readonly hoy = new Date();
  protected readonly fecha = signal<Date | null>(new Date());   // precarga: hoy
  protected readonly monto = signal<number | null>(null);
  protected readonly obs = signal<string>('');

  constructor() {
    // Precarga el monto con el total de la liquidación cuando llega el input.
    effect(() => {
      const t = this.total();
      if (t != null) this.monto.set(t);
    });
  }

  protected readonly valido = computed(() => !!this.fecha() && this.monto() != null && (this.monto() ?? 0) >= 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    const body: InformSettlementBody = {
      informedDate: toIso(this.fecha()),
      informedAmount: this.monto() as number,
    };
    const obs = this.obs().trim();
    if (obs) body.observations = obs;
    this.confirm.emit(body);
  }
}
