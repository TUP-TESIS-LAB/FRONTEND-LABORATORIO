import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { loadHomeVisits } from '../../store/home-visit.actions';
import {
  selectHomeVisits,
  selectHomeVisitsPending,
} from '../../store/home-visit.selectors';
import { HomeVisitStatus } from '../../models/home-visit.model';

interface StatusDisplay {
  label: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
}

const STATUS_MAP: Record<HomeVisitStatus, StatusDisplay> = {
  PROGRAMADA:   { label: 'Programada',   severity: 'info' },
  EXTRAIDA:     { label: 'Extraída',     severity: 'success' },
  EN_TRANSITO:  { label: 'En tránsito',  severity: 'warn' },
  RECEPCIONADA: { label: 'Recepcionada', severity: 'success' },
  NO_REALIZADA: { label: 'No realizada', severity: 'danger' },
  REPROGRAMADA: { label: 'Reprogramada', severity: 'secondary' },
};

@Component({
  selector: 'dom-agenda-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    DataTableComponent,
    UiCellDirective,
    ButtonModule,
    TagModule,
  ],
  template: `
    <ui-page-header heading="Visitas a domicilio" subtitle="Listado de visitas programadas para la sucursal.">
      <p-button
        label="Nueva visita"
        icon="pi pi-plus"
        (onClick)="router.navigate(['/domicilio/nueva'])" />
    </ui-page-header>

    <ui-table
      [value]="visits()"
      [loading]="pending()"
      [columns]="columns"
      dataKey="id"
      emptyHeading="Sin visitas domiciliarias"
      emptyIcon="pi-home"
      emptyDescription="No hay visitas programadas para esta sucursal."
      emptyCtaLabel="Nueva visita"
      (emptyCtaClick)="router.navigate(['/domicilio/nueva'])">

      <!-- Paciente: el backend devuelve patientId (Fase 1); mostramos el ID de forma legible -->
      <ng-template uiCell="paciente" let-row>
        <span class="text-surface-500 text-xs">Paciente #{{ $any(row).patientId }}</span>
        <!-- CONCERN (Fase 2): se resolverá el nombre del paciente cuando el BE lo incluya en el response -->
      </ng-template>

      <!-- Dirección compuesta -->
      <ng-template uiCell="direccion" let-row>
        <div class="font-medium">
          {{ $any(row).addressStreet }}{{ $any(row).addressNumber ? ' ' + $any(row).addressNumber : '' }}
        </div>
        <div class="text-xs text-surface-500">{{ $any(row).addressCity }}</div>
        @if ($any(row).addressReferences) {
          <div class="text-xs text-surface-400 italic">{{ $any(row).addressReferences }}</div>
        }
      </ng-template>

      <!-- Ventana horaria -->
      <ng-template uiCell="ventana" let-row>
        <span class="font-mono text-sm">
          {{ formatTime($any(row).timeWindowStart) }} – {{ formatTime($any(row).timeWindowEnd) }}
        </span>
      </ng-template>

      <!-- Extractor asignado -->
      <ng-template uiCell="extractor" let-row>
        @if ($any(row).assignedExtractorId) {
          <span class="text-surface-500 text-xs">Empleado #{{ $any(row).assignedExtractorId }}</span>
          <!-- CONCERN (Fase 2): se resolverá el nombre del extractor cuando el BE lo incluya -->
        } @else {
          <span class="text-surface-400 text-xs">Sin asignar</span>
        }
      </ng-template>

      <!-- Estado con chip -->
      <ng-template uiCell="estado" let-row>
        @if (statusDisplay($any(row).status); as s) {
          <p-tag [severity]="s.severity" [value]="s.label" />
        }
      </ng-template>

    </ui-table>
  `,
})
export class AgendaPage implements OnInit {
  protected readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly branchCtx = inject(OperatorBranchContextService);

  readonly visits = this.store.selectSignal(selectHomeVisits);
  readonly pending = this.store.selectSignal(selectHomeVisitsPending);

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',  header: 'Paciente' },
    { field: 'direccion', header: 'Dirección' },
    { field: 'ventana',   header: 'Ventana horaria' },
    { field: 'extractor', header: 'Extractor' },
    { field: 'estado',    header: 'Estado', align: 'center' },
  ];

  ngOnInit(): void {
    const branchId = this.branchCtx.branchId() ?? 1;
    this.store.dispatch(loadHomeVisits({ branchId }));
  }

  statusDisplay(status: HomeVisitStatus): StatusDisplay {
    return STATUS_MAP[status] ?? { label: status, severity: 'secondary' };
  }

  /** Convierte 'HH:mm:ss' → 'HH:mm' para mostrar la ventana horaria. */
  formatTime(time: string): string {
    if (!time) return '—';
    return time.substring(0, 5);
  }
}
