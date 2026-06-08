import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
  imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule],
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
            <td class="actions-col">
              <div class="actions-cell">
                <p-button
                  icon="pi pi-user-minus"
                  severity="secondary"
                  [outlined]="true"
                  [rounded]="true"
                  size="small"
                  ariaLabel="No se presentó"
                  pTooltip="No se presentó"
                  tooltipPosition="top"
                  [disabled]="mutating()"
                  (onClick)="noShow.emit(row)"
                />
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  [outlined]="true"
                  [rounded]="true"
                  size="small"
                  ariaLabel="Cancelar extracción"
                  pTooltip="Cancelar extracción"
                  tooltipPosition="top"
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

    .actions-col { width: 1%; white-space: nowrap; }
    .actions-cell { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    /* Igualar la altura de ambos botones para que queden centrados y alineados.
       El de cancelar es icon-only redondo → cuadrado perfecto = círculo. */
    :host ::ng-deep .actions-cell .p-button { height: 2.25rem; }
    :host ::ng-deep .actions-cell .p-button.p-button-icon-only { width: 2.25rem; padding: 0; }

    tr.is-urgent { background: rgba(239,68,68,.04); }
  `],
})
export class InProgressListComponent {
  readonly items = input<InExtractionItem[]>([]);
  readonly mutating = input<boolean>(false);

  @Output() readonly cancel = new EventEmitter<InExtractionItem>();
  @Output() readonly noShow = new EventEmitter<InExtractionItem>();
  @Output() readonly end = new EventEmitter<InExtractionItem>();
}
