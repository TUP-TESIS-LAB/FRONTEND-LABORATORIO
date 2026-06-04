import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InExtractionItem } from '../../models/extraction.model';

/**
 * Lista de todas las extracciones en curso de la sucursal.
 * Reemplaza a `in-progress-extraction-card` para el contexto de sucursal
 * (N filas, una por extracción en curso).
 *
 * Componente presentacional: NO inyecta store ni service.
 * Recibe `items`/`mutating`, emite `cancel`/`end` con el item correspondiente.
 */
@Component({
  selector: 'app-in-progress-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule, ButtonModule, TagModule],
  template: `
    @if (items().length === 0) {
      <div class="empty-state" aria-label="No hay extracciones en curso">
        <i class="pi pi-inbox"></i>
        <div class="empty-state__heading">No hay extracciones en curso</div>
        <div class="empty-state__desc">Cuando un extractor tome un paciente de la cola va a aparecer acá.</div>
      </div>
    } @else {
      <p-table [value]="items()" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Box</th>
            <th>Extractor</th>
            <th>Paciente</th>
            <th>En curso desde</th>
            <th class="actions-col">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [class.is-urgent]="row.isUrgent">
            <td>
              <span class="box-pill">
                <i class="pi pi-box"></i> Box {{ row.attentionBox }}
              </span>
            </td>
            <td>{{ row.extractorFullName }}</td>
            <td>
              <div class="patient-cell">
                <span class="patient-name">{{ row.patientFullName }}</span>
                @if (row.isUrgent) {
                  <p-tag value="URGENTE" severity="danger" icon="pi pi-exclamation-triangle" />
                }
                <span class="patient-meta">DNI {{ row.patientDni }}</span>
              </div>
            </td>
            <td>
              <div class="timer-cell">
                <span class="timer-label">en curso desde <strong>{{ startedLabel(row) }}</strong></span>
                <span class="timer-since">{{ minutesElapsed(row) }} min</span>
              </div>
            </td>
            <td class="actions-col">
              <div class="actions-cell">
                <p-button
                  label="Cancelar"
                  icon="pi pi-times"
                  severity="danger"
                  [outlined]="true"
                  size="small"
                  [disabled]="mutating()"
                  (onClick)="cancel.emit(row)"
                />
                <p-button
                  label="Finalizar"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  [disabled]="mutating()"
                  (onClick)="end.emit(row)"
                />
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    :host { display: block; }

    .empty-state {
      background: #fff;
      border: 1px dashed #e2e8f0;
      border-radius: 12px;
      padding: 40px 24px;
      text-align: center;
      color: #64748b;
    }
    .empty-state i {
      font-size: 32px;
      color: #0891b2;
      opacity: .55;
      display: block;
      margin-bottom: 8px;
    }
    .empty-state__heading {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .empty-state__desc { font-size: 12px; }

    .box-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ccfbf1;
      color: #0f766e;
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .patient-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .patient-name {
      font-weight: 600;
      color: #0f172a;
    }
    .patient-meta {
      font-size: 12px;
      color: #64748b;
    }

    .timer-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .timer-label {
      font-size: 12px;
      color: #64748b;
    }
    .timer-label strong {
      font-weight: 700;
      color: #0f172a;
    }
    .timer-since {
      font-size: 12px;
      font-weight: 600;
      color: #0891b2;
    }

    .actions-col { width: 1%; white-space: nowrap; text-align: right; }
    .actions-cell { display: inline-flex; gap: 6px; justify-content: flex-end; align-items: center; }

    tr.is-urgent { background: rgba(239,68,68,.04); }
  `],
})
export class InProgressListComponent {
  readonly items = input<InExtractionItem[]>([]);
  readonly mutating = input<boolean>(false);

  @Output() readonly cancel = new EventEmitter<InExtractionItem>();
  @Output() readonly end = new EventEmitter<InExtractionItem>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal<number>(Date.now());

  constructor() {
    interval(60_000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  startedLabel(item: InExtractionItem): string {
    if (!item.extractionStartedAt) return '—';
    const d = new Date(item.extractionStartedAt);
    if (Number.isNaN(d.getTime())) return '—';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  minutesElapsed(item: InExtractionItem): number {
    if (!item.extractionStartedAt) return 0;
    const started = new Date(item.extractionStartedAt).getTime();
    if (Number.isNaN(started)) return 0;
    const diffMs = this.now() - started;
    return Math.max(0, Math.floor(diffMs / 60_000));
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
