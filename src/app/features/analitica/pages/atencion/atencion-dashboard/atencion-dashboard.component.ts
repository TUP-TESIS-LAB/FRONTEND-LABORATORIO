import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { ScrollToBottomFabComponent } from '@shared/ui/components/scroll-to-bottom-fab/scroll-to-bottom-fab.component';
import { AttentionResponse, AttentionState, isTerminal } from '../../../models/atencion.model';
import {
  ATTENTION_STATE_LABELS,
  attentionStateLabel,
  attentionStateSeverity,
} from '../../../models/atencion-state-label';
import { AnalysisService } from '../../../services/analysis.service';
import { loadAtenciones, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import { AtencionFilters } from '../../../store/atencion/atencion.state';
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
    TableModule, ButtonModule, InputTextModule, MultiSelectModule, TagModule,
    StatCardComponent, EmptyStateComponent, ScrollToBottomFabComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Atenciones</h2>
          <div class="text-sm text-[var(--ds-text-muted)]">Pendientes para retomar y resumen del día</div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="opacity-60">Modo demo análisis</span>
          <p-button
            [label]="analysisService.demoMode() ? 'ON' : 'OFF'"
            [severity]="analysisService.demoMode() ? 'success' : 'secondary'"
            size="small"
            [outlined]="!analysisService.demoMode()"
            (onClick)="toggleDemoMode()" />
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
            <input pInputText type="text" placeholder="Buscar por Nº de atención o ID de paciente"
                   [ngModel]="filters().search"
                   (ngModelChange)="updateSearch($event)"
                   class="w-full" />
          </span>
          <p-multiSelect
            [options]="stateOptions"
            [ngModel]="filters().states"
            (ngModelChange)="updateStates($event)"
            optionLabel="label"
            optionValue="value"
            placeholder="Filtrar por estado"
            display="chip"
            [maxSelectedLabels]="3"
            selectedItemsLabel="{0} estados"
            styleClass="min-w-[220px]" />
          <p-button label="Limpiar" severity="secondary" [text]="true" (onClick)="clearFilters()" />
        </div>

        @if (loading()) {
          <div class="py-12 text-center text-[var(--ds-text-muted)]">Cargando…</div>
        } @else if (rows().length === 0) {
          <ui-empty-state heading="Sin atenciones para los filtros aplicados" icon="pi-inbox" />
        } @else {
          <p-table [value]="rows()"
                   [rows]="20"
                   [paginator]="true"
                   [rowsPerPageOptions]="[10, 20, 50, 100]"
                   [showCurrentPageReport]="true"
                   currentPageReportTemplate="{first}-{last} de {totalRecords}">
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
                <td>@if (row.isUrgent) { <i class="pi pi-exclamation-triangle text-[var(--color-danger,#ef4444)]"></i> }</td>
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

      <ui-scroll-to-bottom-fab />
    </div>
  `,
})
export class AtencionDashboardComponent implements OnInit {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);
  // Public — used directly in the template for the demo-mode toggle.
  readonly analysisService = inject(AnalysisService);

  protected readonly rows    = this.store.selectSignal(selectFilteredAtenciones);
  protected readonly filters = this.store.selectSignal(selectFilters);
  protected readonly loading = this.store.selectSignal(selectListLoading);
  protected readonly kpis    = this.store.selectSignal(selectAtencionKpis);

  protected readonly isTerminal    = isTerminal;
  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;

  protected readonly stateOptions: Array<{ label: string; value: AttentionState }> =
    (Object.keys(ATTENTION_STATE_LABELS) as AttentionState[])
      .map(value => ({ value, label: ATTENTION_STATE_LABELS[value] }));

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
    // FE-3: payload tipado como Partial<AtencionFilters> en lugar de `as any`.
    const patch: Partial<AtencionFilters> = { search };
    this.store.dispatch(setAtencionFilters({ filters: patch }));
  }

  updateStates(states: AttentionState[]): void {
    const patch: Partial<AtencionFilters> = { states };
    this.store.dispatch(setAtencionFilters({ filters: patch }));
  }

  clearFilters(): void {
    const patch: Partial<AtencionFilters> = { search: '', states: [] };
    this.store.dispatch(setAtencionFilters({ filters: patch }));
  }

  open(row: AttentionResponse): void {
    this.router.navigate(['/analitica/atencion', row.id]);
  }

  toggleDemoMode(): void {
    this.analysisService.setDemoMode(!this.analysisService.demoMode());
  }
}
