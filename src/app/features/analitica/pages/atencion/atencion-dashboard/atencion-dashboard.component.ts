import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
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
  selectFilters,
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
    FormsModule, DatePipe,
    TableModule, ButtonModule, InputTextModule, MultiSelectModule, TagModule, TooltipModule, ConfirmDialogModule,
    EmptyStateComponent, ScrollToBottomFabComponent,
  ],
  template: `
    <!-- Listado de atenciones SIN pantalla propia: se renderiza embebido en la tab
         "Atenciones" de Recepción. El header (título + "Nueva atención") y el "Turnos del
         día" viven en el header global de Recepción, no acá. -->
    <div class="py-2">
      <section class="bg-white rounded-lg shadow-sm p-4">
        <div class="flex gap-2 items-center flex-wrap mb-3">
          <input pInputText type="text" placeholder="Buscar por nombre o DNI"
                 [ngModel]="filters().search"
                 (ngModelChange)="updateSearch($event)"
                 class="flex-1 min-w-[260px]" />
          <p-multiSelect
            [options]="stateOptions()"
            [ngModel]="filters().states"
            (ngModelChange)="updateStates($event)"
            optionLabel="label"
            optionValue="value"
            placeholder="Filtrar por estado"
            display="chip"
            [maxSelectedLabels]="3"
            selectedItemsLabel="{0} estados"
            styleClass="min-w-[220px]" />
          <p-button label="Limpiar" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="clearFilters()" />
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
                   [pageLinks]="5"
                   [showCurrentPageReport]="true"
                   currentPageReportTemplate="{first}-{last} de {totalRecords}">
            <ng-template pTemplate="header">
              <tr>
                <th class="w-36">Fecha</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Estado</th>
                <th>Urg.</th>
                <th class="w-32"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.createdAt ? (row.createdAt | date: 'dd/MM/yy HH:mm') : '—' }}</td>
                <td>
                  <div class="font-medium">{{ row.patientFullName ?? '—' }}</div>
                  <div class="text-xs text-[var(--ds-text-muted)]">{{ row.patientDni ?? '—' }}</div>
                </td>
                <td>{{ row.doctorId ?? '—' }}</td>
                <td>
                  @if (cancellationTooltip(row); as motivo) {
                    <span [pTooltip]="motivo" tooltipPosition="top"
                          tooltipStyleClass="atencion-cancel-tooltip" tabindex="0">
                      <p-tag [value]="stateLabel(row.attentionState)" [severity]="stateSeverity(row.attentionState)" />
                    </span>
                  } @else {
                    <p-tag [value]="stateLabel(row.attentionState)" [severity]="stateSeverity(row.attentionState)" />
                  }
                </td>
                <td>@if (row.isUrgent) { <i class="pi pi-exclamation-triangle text-[var(--color-danger,#ef4444)]"></i> }</td>
                <td>
                  <div class="flex items-center gap-1 justify-end">
                    @if (row.protocolId != null) {
                      <p-button label="Rótulos" icon="pi pi-tag" size="small" severity="secondary" [text]="true"
                                (onClick)="downloadLabels(row)" />
                    }
                    <p-button
                      [label]="resumable(row.attentionState) ? 'Retomar' : 'Ver'"
                      size="small"
                      [outlined]="!resumable(row.attentionState)"
                      (onClick)="open(row)" />
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
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
  protected readonly filters = this.store.selectSignal(selectFilters);
  protected readonly loading = this.store.selectSignal(selectListLoading);

  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;
  protected readonly resumable     = isSecretaryResumable;

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
