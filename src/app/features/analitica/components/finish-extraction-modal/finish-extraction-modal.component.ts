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
import { InExtractionItem, SampleSummary } from '../../models/extraction.model';
import { SampleTypeLabelPipe } from '../../models/sample-type-label.pipe';

const MAX_OBSERVATION_LENGTH = 500;

/**
 * Tipos de muestra que realmente aportan al menos un recipiente. Filtra defensivamente los
 * `tubeCount <= 0` (el backend manda >= 1 por tipo presente, pero no queremos renderizar
 * un chip "× 0" si eso cambiara).
 */
export function containerRows(samples: readonly SampleSummary[] | null | undefined): SampleSummary[] {
  return (samples ?? []).filter((s) => s.tubeCount > 0);
}

/**
 * Total de recipientes a extraer = suma de `tubeCount`.
 *
 * NO se suma `count`: eso cuenta análisis por tipo de muestra, no tubos (varios análisis
 * comparten un mismo tubo).
 */
export function totalContainers(samples: readonly SampleSummary[] | null | undefined): number {
  return containerRows(samples).reduce((acc, s) => acc + s.tubeCount, 0);
}

/** Pluraliza en español una cantidad con su sustantivo. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Modal de confirmación para finalizar una extracción. Muestra un resumen de la
 * atención (paciente, turno, análisis, box) y los recipientes extraídos —desglosados por
 * tipo de muestra y totalizados— para evitar misclicks, y permite adjuntar una observación
 * opcional. Emite `confirmed` con la observación (string, puede ser '') o `dismissed` al
 * cancelar.
 */
@Component({
  selector: 'app-finish-extraction-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, Textarea, SampleTypeLabelPipe],
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
          Revisá los datos antes de finalizar. Al confirmar, la extracción queda cerrada.
        </p>

        @if (patient(); as p) {
          <div class="summary">
            <div class="summary__row">
              <span class="summary__label">Paciente</span>
              <span class="summary__value">{{ p.patientFullName }}</span>
            </div>
            <div class="summary__row">
              <span class="summary__label">DNI</span>
              <span class="summary__value">{{ p.patientDni }}</span>
            </div>
            <div class="summary__row">
              <span class="summary__label">Turno</span>
              <span class="summary__value">{{ p.publicCode ?? p.attentionNumber }}</span>
            </div>
            <div class="summary__row">
              <span class="summary__label">Box</span>
              <span class="summary__value">Box {{ p.attentionBox }}</span>
            </div>
            <div class="summary__row">
              <span class="summary__label">Análisis</span>
              <span class="summary__value">{{ analysisLabel() }}</span>
            </div>
          </div>

          @if (containerRows().length) {
            <section class="samples">
              <div class="samples__head">
                <span class="samples__title">
                  <i class="pi pi-inbox"></i>
                  Recipientes extraídos
                </span>
                <span class="samples__total">{{ containersLabel() }}</span>
              </div>
              <div class="chips-row">
                @for (s of containerRows(); track s.sampleType) {
                  <span class="sample-chip">
                    {{ s.sampleType | sampleTypeLabel }}
                    <span class="chip-count">× {{ s.tubeCount }}</span>
                  </span>
                }
              </div>
            </section>
          }
        }

        <label class="field">
          <span class="field__label">Observación (opcional)</span>
          <textarea
            pTextarea
            class="observation-input"
            rows="3"
            [maxlength]="maxLength"
            placeholder="Ej: muestra hemolizada, se repite extracción"
            [ngModel]="observation()"
            (ngModelChange)="onObservationChange($event)"
            [disabled]="saving()"
          ></textarea>
          <div class="hint-row">
            <span class="muted">Queda registrada en la atención.</span>
            <span class="counter">{{ observation().length }}/{{ maxLength }}</span>
          </div>
        </label>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="onCancel()"
        />
        <p-button
          label="Finalizar extracción"
          severity="success"
          [disabled]="saving()"
          [loading]="saving()"
          (onClick)="onConfirm()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: contents; }
    .body { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
    .info { margin: 0; font-size: 13px; color: #475569; line-height: 1.5; }

    .summary {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .summary__row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }
    .summary__label { color: #64748b; }
    .summary__value { font-weight: 600; color: #0f172a; text-align: right; }

    /* Recipientes a extraer: por tipo de muestra + total */
    .samples { display: flex; flex-direction: column; gap: 8px; }
    .samples__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .samples__title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--ds-text-muted, #6B7280);
    }
    .samples__title i { font-size: 12px; }
    .samples__total {
      font-size: 13px;
      font-weight: 700;
      color: var(--ds-text, #1A1A2E);
    }
    .chips-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .sample-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      background: var(--ds-surface, #EEF0F4);
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-text, #1A1A2E);
    }
    .chip-count {
      font-weight: 700;
      color: var(--brand-primary, #2563EB);
      font-variant-numeric: tabular-nums;
    }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field__label { font-size: 13px; font-weight: 500; }
    .observation-input {
      width: 100%;
      font-family: inherit;
      font-size: 13px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      resize: vertical;
    }
    .observation-input:focus {
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
    .muted { color: #64748b; }
    .counter { color: #94a3b8; font-variant-numeric: tabular-nums; }
  `],
})
export class FinishExtractionModalComponent {
  readonly visible = model<boolean>(false);
  readonly patient = input<InExtractionItem | null>(null);
  readonly saving = input<boolean>(false);

  /** Emite la observación tipeada (puede ser ''). */
  @Output() readonly confirmed = new EventEmitter<string>();
  @Output() readonly dismissed = new EventEmitter<void>();

  readonly observation = signal<string>('');
  readonly maxLength = MAX_OBSERVATION_LENGTH;

  /** Cantidad de análisis de la atención. */
  readonly analysisLabel = computed(() => {
    const p = this.patient();
    return p ? pluralize(p.analysisCount, 'análisis', 'análisis') : '';
  });

  /** Un renglón por tipo de muestra que aporta recipientes. */
  readonly containerRows = computed(() => containerRows(this.patient()?.samples));

  /** Total de recipientes a extraer (suma de tubos, NO de análisis). */
  readonly containersLabel = computed(() =>
    pluralize(totalContainers(this.patient()?.samples), 'recipiente', 'recipientes'),
  );

  readonly headerText = computed(() => {
    const p = this.patient();
    return p ? `Finalizar extracción de ${p.patientFullName}` : 'Finalizar extracción';
  });

  onObservationChange(value: string): void {
    this.observation.set(value ?? '');
  }

  onCancel(): void {
    this.visible.set(false);
    this.dismissed.emit();
  }

  onHide(): void {
    // Reset al cerrar para que la próxima apertura arranque limpio.
    this.observation.set('');
  }

  onConfirm(): void {
    this.confirmed.emit(this.observation().trim());
  }
}
