import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { ScrollToBottomFabComponent } from '@shared/ui/components/scroll-to-bottom-fab/scroll-to-bottom-fab.component';
import { AttentionResponse, AttentionState, isSecretaryResumable } from '../../../models/atencion.model';
import {
  ATTENTION_STATE_LABELS,
  attentionStateLabel,
  attentionStateSeverity,
} from '../../../models/atencion-state-label';
import { downloadProtocolLabels, loadAtenciones, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import { AtencionFilters } from '../../../store/atencion/atencion.state';
import {
  selectListLoading,
  selectTodayAtenciones,
} from '../../../store/atencion/atencion.selectors';

// Estados de la fase financiera: sólo se ofrecen como filtro si el módulo FINANCIERO está activo.
const FINANCIERO_STATES: ReadonlySet<AttentionState> = new Set([
  AttentionState.ON_COLLECTION_PROCESS,
  AttentionState.ON_BILLING_PROCESS,
]);

@Component({
  selector: 'lab-atencion-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    DatePipe,
    TagModule, TooltipModule, ConfirmDialogModule,
    DataTableComponent, UiCellDirective,
    FilterBarComponent,
    ScrollToBottomFabComponent,
  ],
  template: `
    <!-- Listado de atenciones SIN pantalla propia: se renderiza embebido en la tab
         "Atenciones" de Recepción. El header (título + "Nueva atención") y el "Turnos del
         día" viven en el header global de Recepción, no acá. -->
    <div class="py-2">
      <section class="bg-white rounded-lg shadow-sm p-4">
        <div class="mb-3">
          <ui-filter-bar
            [config]="filterConfig()"
            (valueChange)="onFilterChange($event)" />
        </div>

        <ui-table
          [value]="rows()"
          [loading]="loading()"
          [columns]="columns"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          [actions]="rowActions"
          emptyHeading="Sin atenciones para los filtros aplicados"
          emptyIcon="pi-inbox"
          (action)="onAction($event)">

          <ng-template uiCell="fecha" let-row>
            {{ $any(row).createdAt ? ($any(row).createdAt | date: 'dd/MM/yy HH:mm') : '—' }}
          </ng-template>

          <ng-template uiCell="paciente" let-row>
            <div class="font-medium">{{ $any(row).patientFullName ?? '—' }}</div>
            <div class="text-xs text-[var(--ds-text-muted)]">{{ $any(row).patientDni ?? '—' }}</div>
          </ng-template>

          <ng-template uiCell="doctorId" let-row>
            {{ $any(row).doctorId ?? '—' }}
          </ng-template>

          <ng-template uiCell="estado" let-row>
            @if (cancellationTooltip($any(row)); as motivo) {
              <span [pTooltip]="motivo" tooltipPosition="top"
                    tooltipStyleClass="atencion-cancel-tooltip" tabindex="0">
                <p-tag
                  [value]="stateLabel($any(row).attentionState)"
                  [severity]="stateSeverity($any(row).attentionState)" />
              </span>
            } @else {
              <p-tag
                [value]="stateLabel($any(row).attentionState)"
                [severity]="stateSeverity($any(row).attentionState)" />
            }
          </ng-template>

          <ng-template uiCell="urgente" let-row>
            @if ($any(row).isUrgent) {
              <i class="pi pi-exclamation-triangle text-[var(--color-danger,#ef4444)]"></i>
            }
          </ng-template>

        </ui-table>
      </section>

      <ui-scroll-to-bottom-fab />
      <p-confirmDialog />
    </div>
  `,
  styles: [`
    /* Tooltip del motivo de cancelación: que respire y no se corte en una línea. */
    :host ::ng-deep .atencion-cancel-tooltip .p-tooltip-text {
      max-width: 320px;
      white-space: normal;
      line-height: 1.35;
    }
  `],
})
export class AtencionDashboardComponent implements OnInit {
  private readonly store          = inject(Store);
  private readonly router         = inject(Router);
  private readonly moduleRegistry = inject(ModuleRegistry);
  private readonly confirm        = inject(ConfirmationService);

  protected readonly rows    = this.store.selectSignal(selectTodayAtenciones);
  protected readonly loading = this.store.selectSignal(selectListLoading);

  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;

  /**
   * Opciones del filtro de estado, recortadas a los módulos activos del tenant:
   * si FINANCIERO está apagado no ofrecemos Cobro/Facturación (estados que ese
   * tenant nunca alcanza). Es un `computed` para reaccionar a la config del tenant.
   */
  protected readonly stateOptions = computed<Array<{ label: string; value: AttentionState }>>(() => {
    const financieroActive = this.moduleRegistry.isActive(ModuleKey.Financiero);
    return (Object.keys(ATTENTION_STATE_LABELS) as AttentionState[])
      .filter(value => financieroActive || !FINANCIERO_STATES.has(value))
      .map(value => ({ value, label: ATTENTION_STATE_LABELS[value] }));
  });

  /** Config de la barra de filtros; las opciones de estado vienen de `stateOptions()`. */
  readonly filterConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar por nombre o DNI',
    selects: [
      { key: 'states', label: 'Estado', options: this.stateOptions() },
    ],
  }));

  readonly columns: readonly TableColumn[] = [
    { field: 'fecha',    header: 'Fecha' },
    { field: 'paciente', header: 'Paciente' },
    { field: 'doctorId', header: 'Médico' },
    { field: 'estado',   header: 'Estado' },
    { field: 'urgente',  header: 'Urg.', align: 'center' },
  ];

  readonly rowActions: readonly TableAction[] = [
    {
      key: 'rotulos',
      icon: 'pi-tag',
      label: 'Rótulos',
      hidden: (row) => (row as AttentionResponse).protocolId == null,
    },
    {
      key: 'open',
      icon: (row) => isSecretaryResumable((row as AttentionResponse).attentionState) ? 'pi-arrow-right' : 'pi-eye',
      label: (row) => isSecretaryResumable((row as AttentionResponse).attentionState) ? 'Retomar' : 'Ver',
    },
  ];

  ngOnInit(): void {
    this.store.dispatch(loadAtenciones());
  }

  /**
   * Motivo a mostrar en el tooltip del tag de estado. Sólo para estados terminales
   * (Cancelada / Fallida): preferimos la cancelación terminal y caemos al motivo de
   * "no se presentó". Devuelve null cuando no hay motivo que mostrar.
   */
  cancellationTooltip(row: AttentionResponse): string | null {
    if (row.attentionState !== AttentionState.CANCELED && row.attentionState !== AttentionState.FAILED) {
      return null;
    }
    const motivo = row.cancellationReason ?? row.extractionCancellationReason;
    return motivo && motivo.trim() ? motivo : null;
  }

  onFilterChange(value: FilterBarValue): void {
    const patch: Partial<AtencionFilters> = {
      search: value['search'] as string,
      states: (value['states'] as AttentionState[]) ?? [],
    };
    this.store.dispatch(setAtencionFilters({ filters: patch }));
  }

  onAction(ev: { key: string; row: unknown }): void {
    const row = ev.row as AttentionResponse;
    if (ev.key === 'open') {
      this.router.navigate(['/analitica/atencion', row.id]);
    } else if (ev.key === 'rotulos') {
      this.downloadLabels(row);
    }
  }

  /**
   * Reimpresión de rótulos desde el listado. Como los rótulos ya se descargan solos al
   * finalizar la atención, este botón es una REIMPRESIÓN: pedimos confirmación antes de
   * volver a bajar el PDF para evitar descargas accidentales.
   */
  downloadLabels(row: AttentionResponse): void {
    const protocolId = row.protocolId;
    if (protocolId == null) return;
    this.confirm.confirm({
      header: '¿Reimprimir los rótulos?',
      message: 'Se volverá a descargar el PDF de rótulos de esta atención.',
      icon: 'pi pi-tag',
      acceptLabel: 'Reimprimir',
      rejectLabel: 'Cancelar',
      accept: () =>
        this.store.dispatch(downloadProtocolLabels({ protocolId, protocolNumber: `P-${protocolId}` })),
    });
  }
}
