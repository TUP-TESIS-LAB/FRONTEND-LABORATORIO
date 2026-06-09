import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { ScrollToBottomFabComponent } from '@shared/ui/components/scroll-to-bottom-fab/scroll-to-bottom-fab.component';
import { AttentionResponse, AttentionState, isTerminal } from '../../../models/atencion.model';
import {
  ATTENTION_STATE_LABELS,
  attentionStateLabel,
  attentionStateSeverity,
} from '../../../models/atencion-state-label';
import { downloadProtocolLabels, loadAtenciones, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import { AtencionFilters } from '../../../store/atencion/atencion.state';
import {
  selectAtencionKpis,
  selectFilteredAtenciones,
  selectListLoading,
} from '../../../store/atencion/atencion.selectors';

interface KpiTile {
  label: string;
  value: number;
  accent: string;
  sub?: string;
}

@Component({
  selector: 'lab-atencion-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule, TagModule,
    DataTableComponent, UiCellDirective,
    FilterBarComponent,
    StatCardComponent, ScrollToBottomFabComponent,
  ],
  template: `
    <div class="p-6">
      @if (!embedded()) {
        <header class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold">Atenciones</h2>
            <div class="text-sm text-[var(--ds-text-muted)]">Pendientes para retomar y resumen del día</div>
          </div>
          <p-button label="+ Nueva atención" severity="primary" size="small" (onClick)="openNewAttention()" />
        </header>

        <section class="grid grid-cols-5 gap-3 mb-5">
          @for (k of kpiTiles(); track k.label) {
            <ui-stat-card [label]="k.label" [value]="k.value" [accentColor]="k.accent" [sub]="k.sub ?? null" />
          }
        </section>
      }

      <section class="bg-white rounded-lg shadow-sm p-4">
        <div class="mb-3">
          <ui-filter-bar
            [config]="filterConfig"
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

          <ng-template uiCell="estado" let-row>
            <p-tag
              [value]="stateLabel($any(row).attentionState)"
              [severity]="stateSeverity($any(row).attentionState)" />
          </ng-template>

          <ng-template uiCell="urgente" let-row>
            @if ($any(row).isUrgent) {
              <i class="pi pi-exclamation-triangle text-[var(--color-danger,#ef4444)]"></i>
            }
          </ng-template>

        </ui-table>
      </section>

      <ui-scroll-to-bottom-fab />
    </div>
  `,
})
export class AtencionDashboardComponent implements OnInit {
  readonly embedded = input<boolean>(false);

  private readonly store  = inject(Store);
  private readonly router = inject(Router);

  protected readonly rows    = this.store.selectSignal(selectFilteredAtenciones);
  protected readonly loading = this.store.selectSignal(selectListLoading);
  protected readonly kpis    = this.store.selectSignal(selectAtencionKpis);

  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;

  readonly filterConfig: FilterBarConfig = {
    searchPlaceholder: 'Buscar por Nº de atención o paciente…',
    selects: [
      {
        key: 'states',
        label: 'Estado',
        options: (Object.keys(ATTENTION_STATE_LABELS) as AttentionState[]).map(value => ({
          value,
          label: ATTENTION_STATE_LABELS[value],
        })),
      },
    ],
  };

  readonly columns: readonly TableColumn[] = [
    { field: 'attentionNumber', header: 'Nº' },
    { field: 'patientId',       header: 'Paciente' },
    { field: 'doctorId',        header: 'Médico' },
    { field: 'estado',          header: 'Estado' },
    { field: 'urgente',         header: 'Urg.', align: 'center' },
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
      icon: (row) => isTerminal((row as AttentionResponse).attentionState) ? 'pi-eye' : 'pi-arrow-right',
      label: (row) => isTerminal((row as AttentionResponse).attentionState) ? 'Ver' : 'Retomar',
    },
  ];

  protected kpiTiles(): KpiTile[] {
    const k = this.kpis();
    return [
      { label: 'Atenciones del día',   value: k.total,               accent: 'var(--brand-secondary)' },
      { label: 'Pendientes',           value: k.pendientes,          accent: '#f59e0b', sub: 'en curso' },
      { label: 'Esperando extracción', value: k.esperandoExtraccion, accent: '#3b82f6', sub: 'en cola'  },
      { label: 'Finalizadas',          value: k.finalizadas,         accent: '#10b981' },
      { label: 'Urgentes',             value: k.urgentes,            accent: '#ef4444', sub: 'prioritario' },
    ];
  }

  ngOnInit(): void {
    this.store.dispatch(loadAtenciones());
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
    } else if (ev.key === 'rotulos' && row.protocolId != null) {
      this.store.dispatch(downloadProtocolLabels({ protocolId: row.protocolId, protocolNumber: `P-${row.protocolId}` }));
    }
  }

  openNewAttention(): void {
    this.router.navigate(['/analitica/atencion/nueva']);
  }
}
