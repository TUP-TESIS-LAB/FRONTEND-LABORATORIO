import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { EMPTY, catchError } from 'rxjs';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { ScrollToBottomFabComponent } from '@shared/ui/components/scroll-to-bottom-fab/scroll-to-bottom-fab.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { Doctor } from '@features/medicos/models/doctor.model';
import { AttentionResponse, AttentionState, isSecretaryResumable } from '../../../models/atencion.model';
import {
  attentionGroupLabel,
  attentionGroupSeverity,
  buildAttentionStateGroups,
} from '../../../models/atencion-state-label';
import { downloadProtocolLabels, loadAtenciones, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import { AtencionFilters } from '../../../store/atencion/atencion.state';
import {
  selectAtencionKpis,
  selectListLoading,
  selectTodayAtenciones,
} from '../../../store/atencion/atencion.selectors';

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
    StatCardComponent,
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
            {{ doctorName($any(row).doctorId) }}
          </ng-template>

          <ng-template uiCell="estado" let-row>
            @if (cancellationTooltip($any(row)); as motivo) {
              <span class="inline-flex items-center gap-1.5"
                    [pTooltip]="motivo" tooltipPosition="top"
                    tooltipStyleClass="atencion-cancel-tooltip" tabindex="0">
                <p-tag
                  [value]="groupLabel($any(row).attentionState)"
                  [severity]="groupSeverity($any(row).attentionState)" />
                <!-- Pista visual de que hay info en el hover (el tooltip del motivo
                     ya lo aporta el <span> contenedor; el ícono comparte ese hover). -->
                <i class="pi pi-info-circle atencion-cancel-info"></i>
              </span>
            } @else {
              <p-tag
                [value]="groupLabel($any(row).attentionState)"
                [severity]="groupSeverity($any(row).attentionState)" />
            }
          </ng-template>

          <ng-template uiCell="urgente" let-row>
            @if ($any(row).isUrgent) {
              <i class="pi pi-exclamation-triangle text-[var(--color-danger,#ef4444)]"></i>
            }
          </ng-template>

        </ui-table>
      </section>

      <!-- Resumen del día: bloque colapsable con las métricas rápidas del listado. -->
      <section class="bg-white rounded-lg shadow-sm mt-5">
        <button type="button"
                class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--ds-text)]"
                (click)="toggleKpis()"
                [attr.aria-expanded]="kpisExpanded()">
          <span>Resumen del día</span>
          <i class="pi" [class.pi-chevron-down]="!kpisExpanded()" [class.pi-chevron-up]="kpisExpanded()"></i>
        </button>
        @if (kpisExpanded()) {
          <div class="grid grid-cols-2 gap-3 px-4 pb-4">
            <ui-stat-card label="Canceladas hoy" [value]="kpis().canceladasHoy" accentColor="#ef4444" />
            <ui-stat-card label="Finalizadas" [value]="kpis().finalizadas" accentColor="#10b981" />
          </div>
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
    /* Ícono de info junto al tag "Cancelada": chiquito, tenue y con cursor de ayuda
       para señalar que hay un motivo en el hover (comparte el tooltip del contenedor). */
    .atencion-cancel-info {
      font-size: 0.8rem;
      color: var(--p-surface-400, #9ca3af);
      cursor: help;
    }
  `],
})
export class AtencionDashboardComponent implements OnInit {
  private readonly store          = inject(Store);
  private readonly router         = inject(Router);
  private readonly moduleRegistry = inject(ModuleRegistry);
  private readonly confirm        = inject(ConfirmationService);
  private readonly doctorService  = inject(DoctorService);

  protected readonly rows    = this.store.selectSignal(selectTodayAtenciones);
  protected readonly loading = this.store.selectSignal(selectListLoading);
  protected readonly kpis    = this.store.selectSignal(selectAtencionKpis);

  /** Bloque "Resumen del día": arranca colapsado para no robar foco a la lista. */
  protected readonly kpisExpanded = signal(false);

  protected readonly groupLabel    = attentionGroupLabel;
  protected readonly groupSeverity = attentionGroupSeverity;

  /** Lista de médicos del tenant, para resolver el nombre en la columna Médico (B3). */
  private readonly doctors = signal<Doctor[]>([]);

  /** Mapa doctorId → "Apellido, Nombre" para render en la celda Médico. */
  private readonly doctorNameById = computed<ReadonlyMap<number, string>>(() => {
    const map = new Map<number, string>();
    for (const d of this.doctors()) {
      map.set(d.id, `${d.lastName}, ${d.firstName}`);
    }
    return map;
  });

  /**
   * Grupos de estado para el filtro, recortados a los módulos activos del tenant:
   * si FINANCIERO está apagado, los estados de cobro/facturación quedan fuera del
   * grupo "En espera". `computed` para reaccionar a la config del tenant.
   */
  protected readonly stateGroups = computed(() =>
    buildAttentionStateGroups(this.moduleRegistry.isActive(ModuleKey.Financiero)),
  );

  /**
   * Opciones del filtro de estado: una opción POR GRUPO (no por estado suelto). El
   * `value` es el label del grupo; en `onFilterChange` se expande al set de estados.
   */
  protected readonly stateOptions = computed<Array<{ label: string; value: string }>>(() =>
    this.stateGroups().map(g => ({ value: g.label, label: g.label })),
  );

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
      // "Rótulos" (reimpresión): sólo cuando espera extracción y hay protocolo.
      // Finalizada NO reimprime; el resto de estados tampoco lo ofrecen.
      key: 'rotulos',
      icon: 'pi-tag',
      label: 'Rótulos',
      hidden: (row) => {
        const r = row as AttentionResponse;
        return r.attentionState !== AttentionState.AWAITING_EXTRACTION || r.protocolId == null;
      },
    },
    {
      // "Retomar" cuando la secretaría tiene fase abierta (grupo "En espera");
      // "Ver" para esperando/en extracción y finalizada. Canceladas/fallidas: SIN ojito.
      key: 'open',
      icon: (row) => isSecretaryResumable((row as AttentionResponse).attentionState) ? 'pi-arrow-right' : 'pi-eye',
      label: (row) => isSecretaryResumable((row as AttentionResponse).attentionState) ? 'Retomar' : 'Ver',
      hidden: (row) => !this.canOpen((row as AttentionResponse).attentionState),
    },
  ];

  ngOnInit(): void {
    this.store.dispatch(loadAtenciones());
    // Médicos del tenant para resolver el nombre en la columna Médico. Errores en
    // silencio: si falla, la celda cae al fallback "—" (no rompe el listado).
    this.doctorService.list()
      .pipe(catchError(() => EMPTY))
      .subscribe(list => this.doctors.set(list));
  }

  /** Nombre completo del médico (B3). Fallback "—" si no hay id o no se encuentra. */
  doctorName(doctorId: number | null | undefined): string {
    if (doctorId == null) return '—';
    return this.doctorNameById().get(doctorId) ?? '—';
  }

  /**
   * "Ver"/"Retomar" se ofrece para todo MENOS estados terminales no consultables:
   * Cancelada y Fallida NO muestran el ojito (decisión de UX). Finalizada sí (Ver).
   */
  private canOpen(state: AttentionState): boolean {
    return state !== AttentionState.CANCELED && state !== AttentionState.FAILED;
  }

  /** Expande/colapsa el bloque "Resumen del día". */
  toggleKpis(): void {
    this.kpisExpanded.update(v => !v);
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
    // El filtro ofrece GRUPOS (value = label del grupo); el store filtra por estados
    // sueltos. Expandimos cada grupo seleccionado al set de estados que lo componen.
    const selectedGroups = (value['states'] as string[]) ?? [];
    const groups = this.stateGroups();
    const states = selectedGroups.flatMap(
      label => groups.find(g => g.label === label)?.states ?? [],
    );
    const patch: Partial<AtencionFilters> = {
      search: value['search'] as string,
      states,
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
