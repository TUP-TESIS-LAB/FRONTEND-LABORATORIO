import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import {
  loadHomeVisits,
  prepareLabels,
  prepareLabelsSuccess,
  prepareLabelsFailure,
} from '../../store/home-visit.actions';
import {
  selectHomeVisits,
  selectHomeVisitsPending,
  selectActionPending,
} from '../../store/home-visit.selectors';
import { HomeVisit, HomeVisitStatus } from '../../models/home-visit.model';
import { LabelPdfService } from '../../services/label-pdf.service';

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

      <!-- Paciente -->
      <ng-template uiCell="paciente" let-row>
        @if ($any(row).patientName) {
          <span class="font-medium">{{ $any(row).patientName }}</span>
          <div class="text-xs text-surface-500">DNI {{ $any(row).patientDni }}</div>
        } @else {
          <span class="text-surface-500 text-xs">Paciente #{{ $any(row).patientId }}</span>
        }
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
        @if ($any(row).extractorName) {
          <span class="text-sm">{{ $any(row).extractorName }}</span>
        } @else if ($any(row).assignedExtractorId) {
          <span class="text-surface-500 text-xs">Empleado #{{ $any(row).assignedExtractorId }}</span>
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

      <!-- Acciones: Preparar rótulos -->
      <ng-template uiCell="acciones" let-row>
        @if ($any(row).status === 'PROGRAMADA') {
          @if ($any(row).attentionId != null) {
            <!-- Ya preparada: indicador + botón deshabilitado -->
            <div class="flex flex-col gap-1 items-start">
              <p-tag severity="success" value="Preparada" icon="pi pi-check" />
              <p-button
                label="Reimprimir"
                icon="pi pi-print"
                size="small"
                severity="secondary"
                [outlined]="true"
                [disabled]="actionPending()"
                (onClick)="prepararRotulos($any(row))" />
            </div>
          } @else {
            <p-button
              label="Preparar rótulos"
              icon="pi pi-tag"
              size="small"
              severity="primary"
              [disabled]="actionPending()"
              [loading]="actionPending()"
              (onClick)="prepararRotulos($any(row))" />
          }
        }
      </ng-template>

    </ui-table>
  `,
})
export class AgendaPage implements OnInit {
  protected readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly branchCtx = inject(OperatorBranchContextService);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly labelPdf = inject(LabelPdfService);

  readonly visits = this.store.selectSignal(selectHomeVisits);
  readonly pending = this.store.selectSignal(selectHomeVisitsPending);
  readonly actionPending = this.store.selectSignal(selectActionPending);

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',  header: 'Paciente' },
    { field: 'direccion', header: 'Dirección' },
    { field: 'ventana',   header: 'Ventana horaria' },
    { field: 'extractor', header: 'Extractor' },
    { field: 'estado',    header: 'Estado', align: 'center' },
    { field: 'acciones',  header: 'Acciones', align: 'center' },
  ];

  /** Guarda el branchId para poder recargar la lista tras preparar. */
  private currentBranchId = 1;

  ngOnInit(): void {
    const branchId = this.branchCtx.branchId() ?? 1;
    this.currentBranchId = branchId;
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

  prepararRotulos(row: HomeVisit): void {
    this.store.dispatch(prepareLabels({ id: row.id }));
    this.actions$
      .pipe(
        ofType(prepareLabelsSuccess, prepareLabelsFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if (action.type === prepareLabelsSuccess.type) {
          // Generar PDF con los labels recibidos en el payload
          void this.labelPdf.generate(action.visit, action.labels);
          // Recargar la lista para reflejar attentionId != null
          this.store.dispatch(loadHomeVisits({ branchId: this.currentBranchId }));
        }
      });
  }
}
