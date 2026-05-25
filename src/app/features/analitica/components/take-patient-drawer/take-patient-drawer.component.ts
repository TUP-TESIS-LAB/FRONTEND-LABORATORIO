import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { NotificationService } from '@core/services/notification.service';
import { AwaitingExtractionItem } from '../../models/extraction.model';

const STORAGE_KEY = 'extractor.box';

/**
 * Drawer lateral derecho para confirmar la toma de un paciente.
 *
 * - Autocompleta `box` desde `localStorage['extractor.box']`.
 * - Persiste el box al confirmar (UX continua entre tomas del mismo extractor).
 * - El parent controla el envío (`confirm` event); el drawer no toca el store.
 */
@Component({
  selector: 'app-take-patient-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DrawerModule, ButtonModule, InputNumberModule],
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      [style]="{ width: '440px' }"
      [dismissible]="!saving()"
      [closeOnEscape]="!saving()"
      [closable]="!saving()"
      header="Tomar paciente"
    >
      @if (patient(); as p) {
        <div class="drawer-body">
          <section class="patient-card">
            <div class="patient-card__row">
              <span class="muted">Paciente</span>
              <strong>{{ p.patientFullName }}</strong>
            </div>
            <div class="patient-card__row">
              <span class="muted">DNI</span>
              <span>{{ p.patientDni }}</span>
            </div>
            <div class="patient-card__row">
              <span class="muted">Atención</span>
              <span>{{ p.attentionNumber }}</span>
            </div>
            <div class="patient-card__row">
              <span class="muted">Análisis</span>
              <span>{{ p.analysisCount }}</span>
            </div>
            @if (p.isUrgent) {
              <div class="urgent-flag">
                <i class="pi pi-exclamation-triangle"></i> URGENTE
              </div>
            }
          </section>

          <label class="field">
            <span class="field__label">Box de atención <span class="required">*</span></span>
            <p-inputNumber
              [(ngModel)]="boxValue"
              [min]="1"
              [max]="999"
              [showButtons]="true"
              [useGrouping]="false"
              inputId="extractor-box"
              [disabled]="saving()"
              placeholder="Ej: 3"
            />
            <span class="field__hint">Se recordará para tus próximas extracciones.</span>
          </label>
        </div>

        <ng-template pTemplate="footer">
          <div class="drawer-footer">
            <p-button
              label="Cancelar"
              severity="secondary"
              [text]="true"
              [disabled]="saving()"
              (onClick)="onCancel()"
            />
            <p-button
              label="Confirmar y tomar"
              icon="pi pi-check"
              [disabled]="!canConfirm() || saving()"
              [loading]="saving()"
              (onClick)="onConfirm()"
            />
          </div>
        </ng-template>
      }
    </p-drawer>
  `,
  styles: [`
    :host { display: contents; }
    .drawer-body { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
    .patient-card { background: var(--p-surface-50, #f8fafc); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
    .patient-card__row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .muted { color: var(--ds-text-muted, #64748b); }
    .urgent-flag { color: #b91c1c; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field__label { font-size: 13px; font-weight: 500; }
    .required { color: #dc2626; }
    .field__hint { font-size: 12px; color: var(--ds-text-muted, #64748b); }
    .drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class TakePatientDrawerComponent {
  readonly visible = model<boolean>(false);
  readonly patient = input<AwaitingExtractionItem | null>(null);
  readonly saving = input<boolean>(false);

  @Output() readonly confirm = new EventEmitter<{ id: number; box: number }>();

  private readonly notifier = inject(NotificationService);

  readonly boxValue = signal<number | null>(readBoxFromStorage());

  readonly canConfirm = computed(() => {
    const v = this.boxValue();
    return typeof v === 'number' && Number.isInteger(v) && v >= 1;
  });

  constructor() {
    // Reset to stored value on drawer open if the user cleared it last time.
    effect(() => {
      if (this.visible() && this.boxValue() == null) {
        this.boxValue.set(readBoxFromStorage());
      }
    });
  }

  onCancel(): void {
    this.visible.set(false);
  }

  onConfirm(): void {
    const p = this.patient();
    const box = this.boxValue();
    if (!p || box == null || !Number.isInteger(box) || box < 1) {
      this.notifier.error('Indicá un box válido para tomar el paciente.');
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, String(box));
    } catch {
      // Ignoramos errores de quota / private mode — el drawer sigue siendo funcional.
    }
    this.confirm.emit({ id: p.id, box });
  }
}

function readBoxFromStorage(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 ? n : null;
  } catch {
    return null;
  }
}
