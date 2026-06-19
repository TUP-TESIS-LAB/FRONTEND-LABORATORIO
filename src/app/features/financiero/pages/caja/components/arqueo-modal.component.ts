import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Store } from '@ngrx/store';
import { closeSession } from '../../../store/financiero.actions';
import { selectCajaSession } from '../../../store/financiero.selectors';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

@Component({
  selector: 'fin-arqueo-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, Button, FormsModule, InputNumberModule, CurrencyArPipe],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '500px' }"
      (onHide)="closed.emit()">

      <ng-template pTemplate="header">
        <div class="fin-modal__head">
          <div class="fin-modal__head-icon fin-modal__head-icon--slate">
            <i class="pi pi-lock"></i>
          </div>
          <div>
            <h2 class="fin-modal__title">Cerrar caja · arqueo</h2>
            <p class="fin-modal__sub">
              Contá el efectivo del cajón y declaralo.
              La diferencia queda registrada pero no impide el cierre.
            </p>
          </div>
        </div>
      </ng-template>

      <div class="fin-modal__body">
        <div class="arq-table">
          <!-- Esperado -->
          <div class="arq-row">
            <span class="arq-lbl">Efectivo esperado en caja</span>
            <span class="arq-amt mono">{{ esperado() | currencyAr }}</span>
          </div>

          <!-- Declarado -->
          <div class="arq-row">
            <span class="arq-lbl">Efectivo declarado por el operador</span>
            <span class="arq-amt">
              <div class="fin-big-input fin-big-input--sm">
                <span class="fin-big-input__prefix">$</span>
                <p-inputNumber
                  [ngModel]="declarado()" (ngModelChange)="declarado.set($event)"
                  [min]="0"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  placeholder="0,00"
                  [autofocus]="true" />
              </div>
            </span>
          </div>

          <!-- Diferencia (live) -->
          @if (diff() !== null) {
            <div class="arq-row arq-row--diff" [class]="'arq-row--' + diffClass()">
              <span class="arq-lbl">
                @if (diff() === 0) {
                  <i class="pi pi-check-circle"></i> Sin diferencia — caja cuadrada
                } @else if (diff()! > 0) {
                  <i class="pi pi-arrow-up"></i> Sobrante en caja
                } @else {
                  <i class="pi pi-arrow-down"></i> Faltante en caja
                }
              </span>
              <span class="arq-amt mono" [class]="'arq-diff--' + diffClass()">
                {{ diff()! > 0 ? '+' : '' }}{{ diff() | currencyAr }}
              </span>
            </div>
          }
        </div>

        <p class="fin-hint" style="margin-top:12px">
          <i class="pi pi-info-circle"></i>
          Solo se arquea el <b>efectivo</b>. Los cobros con QR, posnet, transferencia
          y tarjetas no forman parte del saldo del cajón.
        </p>
      </div>

      <ng-template pTemplate="footer">
        <div class="fin-modal__footer">
          <p-button label="Cancelar" severity="secondary" (onClick)="closed.emit()" />
          <p-button
            label="Confirmar cierre"
            severity="danger"
            icon="pi pi-lock"
            [disabled]="declarado() === null"
            (onClick)="confirm()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .fin-modal__head { display: flex; align-items: flex-start; gap: 14px; }
    .fin-modal__head-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .fin-modal__head-icon--slate { background: #eceef3; color: #5b6170; }
    .fin-modal__title { margin: 0; font-size: 18px; font-weight: 700; color: #22243a; }
    .fin-modal__sub   { margin: 2px 0 0; font-size: 13px; color: #7c8092; }

    .fin-modal__body { padding: 4px 0; }
    .fin-modal__footer { display: flex; justify-content: flex-end; gap: 10px; }

    .arq-table { display: flex; flex-direction: column; gap: 0; border: 1px solid #e8e9f0; border-radius: 10px; overflow: hidden; }
    .arq-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 18px; gap: 16px;
    }
    .arq-row + .arq-row { border-top: 1px solid #e8e9f0; }
    .arq-lbl { font-size: 13.5px; color: #4a4d63; display: flex; align-items: center; gap: 6px; }
    .arq-amt { font-size: 16px; font-weight: 700; color: #22243a; }
    .mono { font-family: 'Roboto Mono', monospace; }

    /* Diferencia colores */
    .arq-row--diff.arq-row--ok     { background: #f0fdf4; }
    .arq-row--diff.arq-row--warn   { background: #fffbeb; }
    .arq-row--diff.arq-row--danger { background: #fef2f2; }

    .arq-diff--ok     { color: #0f8a55; }
    .arq-diff--warn   { color: #b5740c; }
    .arq-diff--danger { color: #d83a3a; }

    .fin-big-input--sm .fin-big-input__prefix { font-size: 16px; padding: 0 10px; }
    .fin-big-input {
      display: flex; align-items: center;
      border: 1.5px solid #e8e9f0; border-radius: 8px;
      background: white; overflow: hidden;
    }
    .fin-big-input__prefix { color: #7c8092; border-right: 1px solid #e8e9f0; }
    :host ::ng-deep .fin-big-input .p-inputtext {
      border: none !important; box-shadow: none !important;
      font-size: 16px; font-weight: 700; font-family: 'Roboto Mono', monospace;
      color: #22243a; padding: 8px 12px;
    }

    .fin-hint { font-size: 12.5px; color: #7c8092; display: flex; align-items: flex-start; gap: 5px; }
    .fin-hint i { margin-top: 1px; }
  `],
})
export class ArqueoModalComponent {
  readonly esperado = input.required<number>();
  readonly closed   = output<void>();

  private readonly store   = inject(Store);
  private readonly session = this.store.selectSignal(selectCajaSession);

  protected declarado = signal<number | null>(null);

  protected readonly diff = computed<number | null>(() =>
    this.declarado() !== null ? this.declarado()! - this.esperado() : null,
  );

  protected readonly diffClass = computed<'ok' | 'warn' | 'danger'>(() => {
    const d = this.diff();
    if (d === null) return 'ok';
    if (d === 0) return 'ok';
    return Math.abs(d) <= 500 ? 'warn' : 'danger';
  });

  protected confirm(): void {
    const sess = this.session();
    if (!sess || this.declarado() === null) return;
    this.store.dispatch(closeSession({ id: sess.id, declaredAmount: this.declarado()! }));
    this.closed.emit();
  }
}
