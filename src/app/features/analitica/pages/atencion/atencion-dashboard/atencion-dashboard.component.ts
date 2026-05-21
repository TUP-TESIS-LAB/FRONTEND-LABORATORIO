import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { AttentionResponse, AttentionState, isTerminal } from '../../../models/atencion.model';
import { loadAtenciones, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import {
  selectAtencionKpis,
  selectFilteredAtenciones,
  selectFilters,
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
    FormsModule,
    TableModule, ButtonModule, InputTextModule, TagModule,
    StatCardComponent, EmptyStateComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Atenciones</h2>
          <div class="text-sm text-[var(--ds-text-muted)]">Pendientes para retomar y resumen del día</div>
        </div>
      </header>

      <section class="grid grid-cols-5 gap-3 mb-5">
        @for (k of kpiTiles(); track k.label) {
          <ui-stat-card [label]="k.label" [value]="k.value" [accentColor]="k.accent" [sub]="k.sub ?? null" />
        }
      </section>

      <section class="bg-white rounded-lg shadow-sm p-4">
        <div class="flex gap-2 items-center flex-wrap mb-3">
          <span class="p-input-icon-left flex-1 min-w-[260px]">
            <i class="pi pi-search"></i>
            <input pInputText type="text" placeholder="Buscar por DNI, nombre o Nº de atención"
                   [ngModel]="filters().search"
                   (ngModelChange)="updateSearch($event)"
                   class="w-full" />
          </span>
          <input pInputText type="date" [ngModel]="filters().dateFrom" (ngModelChange)="updateRange('dateFrom', $event)" />
          <input pInputText type="date" [ngModel]="filters().dateTo"   (ngModelChange)="updateRange('dateTo', $event)" />
          <p-button label="Limpiar" severity="secondary" [text]="true" (onClick)="clearFilters()" />
        </div>

        @if (loading()) {
          <div class="py-12 text-center text-[var(--ds-text-muted)]">Cargando…</div>
        } @else if (rows().length === 0) {
          <ui-empty-state heading="Sin atenciones para los filtros aplicados" icon="pi-inbox" />
        } @else {
          <p-table [value]="rows()" [rows]="20" [paginator]="rows().length > 20" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Nº</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Estado</th>
                <th>Urg.</th>
                <th class="w-32"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.attentionNumber }}</td>
                <td>{{ row.patientId ?? '—' }}</td>
                <td>{{ row.doctorId ?? '—' }}</td>
                <td>
                  <p-tag [value]="stateLabel(row.attentionState)" [severity]="stateSeverity(row.attentionState)" />
                </td>
                <td>@if (row.isUrgent) { <i class="pi pi-exclamation-triangle text-[var(--color-danger)]"></i> }</td>
                <td>
                  <p-button
                    [label]="isTerminal(row.attentionState) ? 'Ver' : 'Retomar'"
                    size="small"
                    [outlined]="isTerminal(row.attentionState)"
                    (onClick)="open(row)" />
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </section>
    </div>
  `,
})
export class AtencionDashboardComponent implements OnInit {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);

  protected readonly rows    = this.store.selectSignal(selectFilteredAtenciones);
  protected readonly filters = this.store.selectSignal(selectFilters);
  protected readonly loading = this.store.selectSignal(selectListLoading);
  protected readonly kpis    = this.store.selectSignal(selectAtencionKpis);

  protected readonly isTerminal = isTerminal;

  protected kpiTiles(): KpiTile[] {
    const k = this.kpis();
    return [
      { label: 'Atenciones del día',  value: k.total,               accent: 'var(--brand-secondary)' },
      { label: 'Pendientes',          value: k.pendientes,          accent: '#f59e0b', sub: 'en curso' },
      { label: 'Esperando extracción', value: k.esperandoExtraccion, accent: '#3b82f6', sub: 'en cola'  },
      { label: 'Finalizadas',         value: k.finalizadas,         accent: '#10b981' },
      { label: 'Urgentes',            value: k.urgentes,            accent: '#ef4444', sub: 'prioritario' },
    ];
  }

  ngOnInit(): void {
    this.store.dispatch(loadAtenciones());
  }

  updateSearch(search: string): void {
    this.store.dispatch(setAtencionFilters({ filters: { search } }));
  }

  updateRange(field: 'dateFrom' | 'dateTo', value: string): void {
    this.store.dispatch(setAtencionFilters({ filters: { [field]: value } as any }));
  }

  clearFilters(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.store.dispatch(setAtencionFilters({
      filters: { search: '', states: [], dateFrom: today, dateTo: today },
    }));
  }

  open(row: AttentionResponse): void {
    this.router.navigate(['/analitica/atencion', row.id]);
  }

  stateLabel(state: AttentionState): string {
    return STATE_LABEL[state] ?? state;
  }

  stateSeverity(state: AttentionState): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (state === AttentionState.FINISHED) return 'success';
    if (state === AttentionState.CANCELED || state === AttentionState.FAILED) return 'danger';
    if (state === AttentionState.AWAITING_EXTRACTION || state === AttentionState.IN_EXTRACTION) return 'info';
    return 'warn';
  }
}

const STATE_LABEL: Record<AttentionState, string> = {
  [AttentionState.REGISTERING_GENERAL_DATA]: 'Datos generales',
  [AttentionState.REGISTERING_ANALYSES]:     'Análisis',
  [AttentionState.ON_COLLECTION_PROCESS]:    'Cobro',
  [AttentionState.ON_BILLING_PROCESS]:       'Facturación',
  [AttentionState.AWAITING_CONFIRMATION]:    'Confirmación',
  [AttentionState.AWAITING_EXTRACTION]:      'Esperando extracción',
  [AttentionState.IN_EXTRACTION]:            'En extracción',
  [AttentionState.FINISHED]:                 'Finalizada',
  [AttentionState.CANCELED]:                 'Cancelada',
  [AttentionState.FAILED]:                   'Fallida',
};
