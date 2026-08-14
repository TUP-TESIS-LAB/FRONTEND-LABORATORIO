import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { InExtractionItem } from '../../models/extraction.model';

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

/**
 * Modal centrado para cancelar una extracción exigiendo motivo. Validación:
 * el reason trimmed debe tener al menos 5 caracteres (el backend hace la
 * misma validación). Contador visible "X/500".
 */
@Component({
  selector: 'app-cancel-extraction-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, Textarea],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closable]="!saving()"
      [closeOnEscape]="!saving()"
      [style]="{ width: '480px' }"
      [header]="headerText()"
      (onHide)="onHide()"
    >
      <div class="body">
        <p class="info">
          El paciente <strong>no</strong> vuelve a la cola: el flujo termina acá.
        </p>
        <div class="quick-reasons">
          <p-button
            label="Vía difícil"
            severity="secondary"
            [outlined]="true"
            size="small"
            [disabled]="saving()"
            (onClick)="setQuickReason('No se pudo canalizar (vía difícil)')"
          />
          <p-button
            label="Descompensado"
            severity="secondary"
            [outlined]="true"
            size="small"
            [disabled]="saving()"
            (onClick)="setQuickReason('Paciente descompensado')"
          />
        </div>
        <label class="field">
          <span class="field__label">Motivo <span class="required">*</span></span>
          <textarea
            pTextarea
            class="reason-input"
            rows="4"
            [maxlength]="maxLength"
            placeholder="Ej: no se pudo canalizar (vía difícil)"
            [ngModel]="reason()"
            (ngModelChange)="onReasonChange($event)"
            [disabled]="saving()"
          ></textarea>
          <div class="hint-row">
            @if (showError()) {
              <span class="error">Mínimo {{ minLength }} caracteres.</span>
            }
            <span class="counter" [class.counter--ok]="canConfirm()">
              {{ trimmedLength() }}/{{ maxLength }}
            </span>
          </div>
        </label>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Volver"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="onCancel()"
        />
        <p-button
          label="Cancelar extracción"
          severity="danger"
          [disabled]="!canConfirm() || saving()"
          [loading]="saving()"
          (onClick)="onConfirm()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: contents; }
    .body { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
    .quick-reasons { display: flex; flex-wrap: wrap; gap: 8px; }
    .info { margin: 0; font-size: 13px; color: #475569; line-height: 1.5; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field__label { font-size: 13px; font-weight: 500; }
    .required { color: #dc2626; }
    .reason-input {
      width: 100%;
      font-family: inherit;
      font-size: 13px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      resize: vertical;
      /* KAN-307: sin tope, arrastrando el handle el textarea crece sin límite y estira
         el modal fuera de la pantalla. */
      max-height: 40vh;
    }
    .reason-input:focus {
      outline: 2px solid rgba(15,118,110,.18);
      outline-offset: 1px;
      border-color: #0f766e;
    }
    .hint-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      align-items: center;
    }
    .error { color: #dc2626; font-weight: 500; }
    /* margin-left:auto ancla el contador a la derecha aunque sea el único hijo del
       hint-row (el hint informativo se sacó en KAN-307 y el error solo aparece a veces). */
    .counter { color: #94a3b8; font-variant-numeric: tabular-nums; margin-left: auto; }
    .counter--ok { color: #0f766e; }
  `],
})
export class CancelExtractionDialogComponent {
  readonly visible = model<boolean>(false);
  readonly patient = input<InExtractionItem | null>(null);
  readonly saving = input<boolean>(false);

  @Output() readonly cancelConfirmed = new EventEmitter<{ reason: string }>();

  readonly reason = signal<string>('');
  readonly minLength = MIN_REASON_LENGTH;
  readonly maxLength = MAX_REASON_LENGTH;

  readonly trimmedLength = computed(() => this.reason().trim().length);
  readonly canConfirm = computed(() => this.trimmedLength() >= MIN_REASON_LENGTH);
  /** Mostramos el error sólo cuando el usuario tipeó algo. */
  readonly showError = computed(() => {
    const len = this.trimmedLength();
    return len > 0 && len < MIN_REASON_LENGTH;
  });

  readonly headerText = computed(() => {
    const p = this.patient();
    return p ? `Cancelar extracción de ${p.patientFullName}` : 'Cancelar extracción';
  });

  onReasonChange(value: string): void {
    this.reason.set(value ?? '');
  }

  setQuickReason(text: string): void {
    this.reason.set(text);
  }

  onCancel(): void {
    this.visible.set(false);
  }

  onHide(): void {
    // Reset al cerrar para que la próxima apertura arranque limpio.
    this.reason.set('');
  }

  onConfirm(): void {
    if (!this.canConfirm()) return;
    this.cancelConfirmed.emit({ reason: this.reason().trim() });
  }
}
