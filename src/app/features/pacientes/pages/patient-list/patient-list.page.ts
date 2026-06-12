import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, debounceTime } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { Patient, PatientStatus } from '../../models/patient.model';
import { genderLabel, statusLabel } from '../../models/patient-labels';
import { PatientStateFilter } from '../../models/patient-page.model';
import { getCoveragePlanLabel, CoveragePlanOption } from '../../models/coverage-plans.catalog';
import { CoveragePlansService } from '../../services/coverage-plans.service';
import {
  setPatientPageRequest, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectAllPatients, selectPatientPending, selectPatientPageRequest, selectPatientTotalElements,
} from '../../store/patient.selectors';

@Component({
  selector: 'pat-patient-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, ButtonModule, TagModule,
    ConfirmDialogModule, DatePipe, DniPipe, AgePipe,
    DataTableComponent, UiCellDirective, FilterBarComponent,
  ],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="p-6 flex flex-col h-full min-h-0">
      <header class="flex items-center justify-between mb-4">
        <h2 class="page-title"><i class="pi pi-address-book page-title-icon" aria-hidden="true"></i> Pacientes</h2>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          @if (canMutate()) {
            <a [routerLink]="['/pacientes', 'nuevo']">
              <p-button label="Nuevo paciente" icon="pi pi-plus" />
            </a>
          }
        </div>
      </header>

      <div class="mb-3">
        <ui-filter-bar [config]="filterConfig" (valueChange)="onFilterChange($event)" />
      </div>

      <div class="flex-1 min-h-0 flex flex-col">
      <ui-table
        [value]="items()"
        [loading]="pending()"
        [columns]="columns"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageRequest().size"
        [rowsPerPageOptions]="[10, 20, 50, 100]"
        [scrollHeight]="'flex'"
        [totalRecords]="total()"
        [first]="pageRequest().page * pageRequest().size"
        [showView]="true"
        [showEdit]="canMutate()"
        [actions]="canMutate() ? toggleAction : []"
        emptyHeading="Sin pacientes"
        emptyIcon="pi-users"
        [emptyCtaLabel]="canMutate() ? 'Nuevo paciente' : null"
        (lazyLoad)="onPage($event)"
        (view)="router.navigate(['/pacientes', $any($event).id])"
        (edit)="router.navigate(['/pacientes', $any($event).id, 'editar'])"
        (action)="onAction($event)"
        (emptyCtaClick)="router.navigate(['/pacientes', 'nuevo'])">

        <ng-template uiCell="paciente" let-row>
          <div class="font-medium">{{ $any(row).lastName }}, {{ $any(row).firstName }}</div>
          <div class="text-xs text-surface-500">{{ genderLabel($any(row).gender) }} · {{ $any(row).birthDate | age }} años</div>
        </ng-template>

        <ng-template uiCell="dni" let-row>
          {{ $any(row).dni | dni }}
        </ng-template>

        <ng-template uiCell="birthDate" let-row>
          {{ $any(row).birthDate | date:'dd/MM/yyyy' }}
        </ng-template>

        <ng-template uiCell="obraSocial" let-row>
          {{ primaryCoverageLabel($any(row)) }}
        </ng-template>

        <ng-template uiCell="telefono" let-row>
          {{ primaryPhone($any(row)) }}
        </ng-template>

        <ng-template uiCell="estado" let-row>
          <p-tag [severity]="rowStatusSeverity($any(row))" [value]="rowStatusLabel($any(row))" />
          @if (!$any(row).active) {
            <p-tag severity="danger" value="Inactivo" class="ml-1" />
          }
        </ng-template>
      </ui-table>
      </div>

      <p-confirmDialog />
    </div>
  `,
})
export class PatientListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly search$ = new Subject<string>();
  private readonly perms = inject(PatientPermissionsService);
  private readonly plansService = inject(CoveragePlansService);
  protected readonly router = inject(Router);
  readonly canMutate = this.perms.canMutate;

  readonly items = this.store.selectSignal(selectAllPatients);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly total = this.store.selectSignal(selectPatientTotalElements);
  readonly pageRequest = this.store.selectSignal(selectPatientPageRequest);

  private readonly plans = signal<readonly CoveragePlanOption[]>([]);

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',   header: 'Paciente' },
    { field: 'dni',        header: 'DNI' },
    { field: 'birthDate',  header: 'Fecha nac.' },
    { field: 'obraSocial', header: 'Obra social' },
    { field: 'telefono',   header: 'Teléfono' },
    { field: 'estado',     header: 'Estado' },
  ];

  readonly toggleAction: readonly TableAction[] = [
    { key: 'toggle', icon: 'pi-times-circle', label: 'Activar/Desactivar' },
  ];

  readonly stateOptions: { value: PatientStateFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
  ];

  // Config del FilterBar estándar. El estado es single-value (active/inactive; sin
  // selección = todos) y "Sólo completos" es un toggle booleano: ambos se mapean a
  // arrays de un elemento y se interpretan en onFilterChange.
  readonly filterConfig: FilterBarConfig = {
    searchPlaceholder: 'Buscar por nombre o DNI…',
    selects: [
      {
        key: 'state',
        label: 'Estado',
        options: [
          { value: 'active', label: 'Activos' },
          { value: 'inactive', label: 'Inactivos' },
        ],
      },
      {
        key: 'completos',
        label: 'Completitud',
        options: [{ value: 'COMPLETE', label: 'Sólo completos' }],
      },
    ],
  };

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) =>
      this.store.dispatch(setPatientPageRequest({ patch: { q, page: 0 } })),
    );
    this.plansService.getActivePlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => { /* lista queda vacía; no se expone el error al usuario */ },
    });
  }

  onSearch(q: string): void { this.search$.next(q); }

  setState(state: PatientStateFilter): void {
    this.store.dispatch(setPatientPageRequest({ patch: { state, page: 0 } }));
  }

  toggleCompleteFilter(): void {
    const next: PatientStatus | undefined = this.pageRequest().status === 'COMPLETE' ? undefined : 'COMPLETE';
    this.store.dispatch(setPatientPageRequest({ patch: { status: next, page: 0 } }));
  }

  /**
   * Cableo del FilterBar estándar a la lógica de filtrado existente. El search pasa por
   * el mismo debounce (search$); estado y completitud son single-value mapeados desde
   * los arrays del filter-bar (sin selección = 'all' / sin status) y se despachan ya.
   * Resetea page a 0.
   */
  onFilterChange(value: FilterBarValue): void {
    this.search$.next((value['search'] as string) ?? '');

    const states = (value['state'] as PatientStateFilter[]) ?? [];
    const state: PatientStateFilter = states.length ? states[states.length - 1] : 'all';

    const completos = (value['completos'] as string[]) ?? [];
    const status: PatientStatus | undefined = completos.includes('COMPLETE') ? 'COMPLETE' : undefined;

    // Solo despachamos estado/completitud acá; el texto va por el debounce de search$
    // para no duplicar requests en cada tecla.
    if (state !== this.pageRequest().state || status !== this.pageRequest().status) {
      this.store.dispatch(setPatientPageRequest({ patch: { state, status, page: 0 } }));
    }
  }

  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setPatientPageRequest({ patch: { page, size: rows } }));
  }

  onAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'toggle') this.confirmToggle(ev.row as Patient);
  }

  confirmToggle(p: Patient): void {
    const deleted = p.active;
    const verb = deleted ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} paciente?`,
      message: `${p.lastName}, ${p.firstName}`,
      acceptLabel: deleted ? 'Desactivar' : 'Reactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }

  statusSeverity(status: PatientStatus): 'info' | 'success' | 'warn' {
    return status === 'COMPLETE' ? 'success' : status === 'VERIFIED' ? 'info' : 'warn';
  }

  // El estado "verificado" es un acto humano: se deriva de `verifiedAt`, no del
  // enum de completitud (status MIN/COMPLETE). Un paciente verificado (p. ej. el
  // alta/edición manual del laboratorio, auto-verificada al guardar) se muestra
  // como "Verificado"; el resto cae al estado de completitud.
  rowStatusSeverity(p: Patient): 'info' | 'success' | 'warn' {
    return p.verifiedAt ? 'info' : this.statusSeverity(p.status);
  }

  readonly genderLabel = genderLabel;

  rowStatusLabel(p: Patient): string {
    return p.verifiedAt ? 'Verificado' : statusLabel(p.status);
  }

  primaryCoverageLabel(p: Patient): string {
    const c = p.coverages.find((x) => x.isPrimary && x.active) ?? p.coverages.find((x) => x.active);
    return c ? getCoveragePlanLabel(c.planId, this.plans()) : 'Particular';
  }

  primaryPhone(p: Patient): string {
    const c = p.contacts.find((x) => x.contactType === 'PHONE' && x.active);
    return c?.contactValue ?? '—';
  }
}
