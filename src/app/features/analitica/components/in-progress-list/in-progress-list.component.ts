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
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
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
  imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule, EmptyStateComponent],
  template: `
    @if (items().length === 0) {
      <ui-empty-state
        icon="pi-inbox"
        heading="No hay extracciones en curso"
        description="Cuando un extractor tome un paciente de la cola va a aparecer acá." />
    } @else {
      <p-table [value]="items()" styleClass="p-datatable-sm" scrollable scrollHeight="flex">
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
                Box {{ row.attentionBox }}
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
    /* Llena la card y centra verticalmente el empty-state (cuando no hay tabla). */
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host > ui-empty-state { margin: auto 0; }

    /* La p-table llena el alto del host y scrollea su body internamente, con el
       header sticky (PrimeNG scrollHeight="flex"). Cadena con min-height:0. */
    :host > p-table { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    :host ::ng-deep .p-datatable { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
    :host ::ng-deep .p-datatable-table-container { flex: 1 1 auto; min-height: 0; }

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
