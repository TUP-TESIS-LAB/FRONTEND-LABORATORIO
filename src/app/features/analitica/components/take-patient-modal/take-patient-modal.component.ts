import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Output,
  computed,
  input,
  model,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { AwaitingExtractionItem, BoxAssignment } from '../../models/extraction.model';
import { SampleTypeLabelPipe } from '../../models/sample-type-label.pipe';

type BoxState = 'libre' | 'ocupado' | 'sin-asignar';

interface BoxRow {
  boxNumber: number;
  fKey: string;         // 'F1', 'F2', …
  extractorFullName: string | null;
  state: BoxState;
}

/**
 * Modal para confirmar la toma de un paciente seleccionando el box mediante
 * teclas F1..Fn o click.
 *
 * Inputs:
 *  - visible    — two-way (model<boolean>): controla la visibilidad.
 *  - patient    — paciente en espera (null cuando el modal está oculto).
 *  - boxes      — lista de boxes de la sucursal, ordenados por boxNumber.
 *  - inProgressExtractorIds — ids de extractores que ya tienen una extracción en curso.
 *
 * Output:
 *  - assign — emite el boxNumber seleccionado.
 */
@Component({
  selector: 'app-take-patient-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule, SampleTypeLabelPipe],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      [closeOnEscape]="true"
      [style]="{ width: '520px' }"
      [breakpoints]="{ '768px': '100vw' }"
      styleClass="ui-dialog-fullscreen-mobile"
      (onHide)="onDialogHide()"
    >
      <ng-template pTemplate="header">
        <div class="modal-header">
          @if (patient(); as p) {
            <div class="patient-info">
              <span class="patient-name">{{ p.patientFullName }}</span>
              <div class="patient-meta">
                <span class="meta-item">
                  <i class="pi pi-id-card"></i> {{ p.patientDni }}
                </span>
                <span class="meta-item">
                  <i class="pi pi-ticket"></i> {{ p.publicCode ?? p.attentionNumber }}
                </span>
                @if (p.isUrgent) {
                  <span class="urgent-badge">
                    <i class="pi pi-exclamation-triangle"></i> URGENTE
                  </span>
                }
              </div>
            </div>
          } @else {
            <span class="patient-name">Seleccionar box</span>
          }
        </div>
      </ng-template>

      <div class="modal-body">
        <!-- Sección muestras -->
        @if (patient()?.samples?.length) {
          <section class="section">
            <h4 class="section-title">
              <i class="pi pi-flask"></i> Muestras a extraer
            </h4>
            <div class="chips-row">
              @for (s of patient()!.samples; track s.sampleType) {
                <span class="sample-chip">
                  <i class="pi pi-circle-fill"></i>
                  {{ s.sampleType | sampleTypeLabel }}
                  <span class="chip-count">× {{ s.count }}</span>
                </span>
              }
            </div>
          </section>
        }

        <!-- Sección boxes -->
        <section class="section">
          <h4 class="section-title">
            <i class="pi pi-box"></i> Seleccioná un box
          </h4>
          @if (boxRows().length) {
            <div class="boxes-list">
              @for (row of boxRows(); track row.boxNumber) {
                <button
                  type="button"
                  class="box-row"
                  [class.box-row--libre]="row.state === 'libre'"
                  [class.box-row--ocupado]="row.state === 'ocupado'"
                  [class.box-row--sin-asignar]="row.state === 'sin-asignar'"
                  [disabled]="row.state !== 'libre'"
                  (click)="onBoxClick(row)"
                  [attr.aria-label]="'Seleccionar Box ' + row.boxNumber"
                >
                  <span class="fkey-badge" [class.fkey-badge--active]="row.state === 'libre'">
                    {{ row.fKey }}
                  </span>
                  <span class="box-info">
                    <span class="box-label">Box {{ row.boxNumber }}</span>
                    <span class="box-extractor">
                      {{ row.extractorFullName ?? 'Sin asignar' }}
                    </span>
                  </span>
                  <span class="box-state-pill" [class]="'box-state-pill--' + row.state">
                    @switch (row.state) {
                      @case ('libre') { <i class="pi pi-check-circle"></i> Libre }
                      @case ('ocupado') { <i class="pi pi-clock"></i> Ocupado }
                      @case ('sin-asignar') { <i class="pi pi-minus-circle"></i> Sin asignar }
                    }
                  </span>
                </button>
              }
            </div>
          } @else {
            <div class="empty-boxes">
              <i class="pi pi-inbox"></i>
              <span>No hay boxes configurados para esta sucursal.</span>
            </div>
          }
        </section>
      </div>

      <ng-template pTemplate="footer">
        <div class="modal-footer">
          <i class="pi pi-info-circle footer-icon"></i>
          <span class="footer-note">
            Tras asignar, la extracción arranca. Tenés 5s para deshacer.
          </span>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: contents; }

    /* ── Header ─────────────────────────────────────────────── */
    .modal-header { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .patient-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--ds-text, #1A1A2E);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .patient-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--ds-text-muted, #6B7280);
      margin-top: 2px;
    }
    .meta-item { display: inline-flex; align-items: center; gap: 4px; }
    .meta-item i { font-size: 11px; }
    .urgent-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #b91c1c;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.4px;
    }

    /* ── Body ────────────────────────────────────────────────── */
    .modal-body { display: flex; flex-direction: column; gap: 20px; padding: 4px 0; }

    .section { display: flex; flex-direction: column; gap: 10px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ds-text-muted, #6B7280);
      margin: 0;
    }
    .section-title i { font-size: 12px; }

    /* Chips de muestras */
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
    .sample-chip i { font-size: 8px; color: var(--brand-primary, #2563EB); }
    .chip-count {
      font-weight: 700;
      color: var(--brand-primary, #2563EB);
    }

    /* Filas de boxes */
    .boxes-list { display: flex; flex-direction: column; gap: 6px; }

    .box-row {
      width: 100%;
      display: grid;
      grid-template-columns: 44px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: #fff;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      transition: background 0.12s, border-color 0.12s, transform 0.1s;
    }
    .box-row:disabled { cursor: not-allowed; opacity: 0.65; }
    .box-row--libre:not(:disabled):hover {
      background: #f0fdf4;
      border-color: var(--ds-success, #22C55E);
      transform: translateY(-1px);
    }
    .box-row--libre { border-color: var(--ds-success, #22C55E); background: #f0fdf4; }
    .box-row--ocupado { border-color: #fde68a; background: #fffbeb; }
    .box-row--sin-asignar { border-color: #e2e8f0; background: #f8fafc; }

    /* Badge de tecla F */
    .fkey-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 28px;
      border-radius: 6px;
      background: #e2e8f0;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      letter-spacing: 0.3px;
      font-family: monospace;
    }
    .fkey-badge--active {
      background: var(--ds-success, #22C55E);
      color: #fff;
      border-color: var(--ds-success, #22C55E);
    }

    /* Info del box */
    .box-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .box-label { font-size: 13px; font-weight: 600; color: var(--ds-text, #1A1A2E); }
    .box-extractor {
      font-size: 11px;
      color: var(--ds-text-muted, #6B7280);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Pill de estado */
    .box-state-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
    }
    .box-state-pill i { font-size: 10px; }
    .box-state-pill--libre { background: #dcfce7; color: #15803d; }
    .box-state-pill--ocupado { background: #fef3c7; color: #b45309; }
    .box-state-pill--sin-asignar { background: #f1f5f9; color: #64748b; }

    /* Empty state */
    .empty-boxes {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: var(--ds-text-muted, #6B7280);
      font-size: 13px;
      font-style: italic;
    }
    .empty-boxes i { font-size: 16px; }

    /* Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--ds-text-muted, #6B7280);
      font-style: italic;
    }
    .footer-icon { font-size: 13px; color: var(--brand-primary, #2563EB); flex-shrink: 0; }
    .footer-note { line-height: 1.4; }
  `],
})
export class TakePatientModalComponent {
  /** Two-way binding: true = modal visible. */
  readonly visible = model<boolean>(false);

  /** Paciente en espera seleccionado. */
  readonly patient = input<AwaitingExtractionItem | null>(null);

  /** Boxes configurados en la sucursal, ordenados por boxNumber. */
  readonly boxes = input<BoxAssignment[]>([]);

  /**
   * IDs de extractores que ya tienen una extracción en curso.
   * Un box cuyo extractorId figure aquí se marca como "ocupado".
   */
  readonly inProgressExtractorIds = input<number[]>([]);

  /** Emite el boxNumber elegido para iniciar la extracción. */
  @Output() readonly assign = new EventEmitter<number>();

  /** Filas de boxes con estado calculado para el template. */
  readonly boxRows = computed<BoxRow[]>(() => {
    const bs = this.boxes();
    const inProgress = this.inProgressExtractorIds();

    return bs
      .slice()
      .sort((a, b) => a.boxNumber - b.boxNumber)
      .map((b, idx) => ({
        boxNumber: b.boxNumber,
        fKey: `F${idx + 1}`,
        extractorFullName: b.extractorFullName,
        state: resolveBoxState(b, inProgress),
      }));
  });

  onBoxClick(row: BoxRow): void {
    if (row.state !== 'libre') return;
    this.assign.emit(row.boxNumber);
    this.visible.set(false);
  }

  onDialogHide(): void {
    // El dialog ya seteó visible=false via two-way binding; nada más que hacer.
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (!this.visible()) return;

    if (ev.key === 'Escape') {
      // PrimeNG ya cierra el dialog; nos aseguramos de sincronizar el modelo.
      this.visible.set(false);
      return;
    }

    // F1..Fn → mapear al box en esa posición.
    const match = /^F(\d+)$/.exec(ev.key);
    if (!match) return;

    const fIndex = Number.parseInt(match[1], 10) - 1; // 0-based
    const rows = this.boxRows();
    if (fIndex < 0 || fIndex >= rows.length) return;

    const row = rows[fIndex];
    if (row.state !== 'libre') return;

    ev.preventDefault();
    this.assign.emit(row.boxNumber);
    this.visible.set(false);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveBoxState(box: BoxAssignment, inProgressIds: number[]): BoxState {
  if (box.extractorId == null) return 'sin-asignar';
  if (inProgressIds.includes(box.extractorId)) return 'ocupado';
  return 'libre';
}
