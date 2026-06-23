import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { Patient, PatientStatus } from '../../models/patient.model';
import { genderLabel, statusLabel } from '../../models/patient-labels';
import { PatientStateFilter } from '../../models/patient-page.model';
import { getCoveragePlanLabel, CoveragePlanOption } from '../../models/coverage-plans.catalog';
import { CoveragePlansService } from '../../services/coverage-plans.service';
import {
  setPatientPageRequest, togglePatientActive,
  createPatientPortalAccount, resendPatientPortalAccess,
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
    DataTableComponent, UiCellDirective, FilterBarComponent, PageHeaderComponent,
  ],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0">
      <ui-page-header heading="Pacientes">
        <p-button label="Exportar" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
        @if (canMutate()) {
          <a [routerLink]="['/pacientes', 'nuevo']">
            <p-button label="Nuevo paciente" />
          </a>
        }
      </ui-page-header>

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
        [entityLabel]="'pacientes'"
        [scrollHeight]="'flex'"
        [totalRecords]="total()"
        [first]="pageRequest().page * pageRequest().size"
        [showView]="true"
        [showEdit]="canMutate()"
        [actions]="canMutate() ? portalActions : []"
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

        <ng-template uiCell="accesoPortal" let-row>
          @if ($any(row).accountStatus === 'ACTIVE') {
            <span class="text-green-600 text-xs"><i class="pi pi-check-circle mr-1"></i>Activa</span>
          } @else if ($any(row).accountStatus === 'PENDING') {
            <span class="text-yellow-600 text-xs"><i class="pi pi-clock mr-1"></i>Pendiente</span>
          } @else if ($any(row).managedBy) {
            <span class="text-surface-500 text-xs">
              <i class="pi pi-users mr-1"></i>{{ accesoPortalLabel($any(row)) }}
            </span>
          } @else {
            <span class="text-surface-400 text-xs">Sin cuenta</span>
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
  private readonly moduleRegistry = inject(ModuleRegistry);
  protected readonly router = inject(Router);
  readonly canMutate = this.perms.canMutate;
  protected readonly portalActive = computed(() => this.moduleRegistry.isActive(ModuleKey.Portal));

  readonly items = this.store.selectSignal(selectAllPatients);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly total = this.store.selectSignal(selectPatientTotalElements);
  readonly pageRequest = this.store.selectSignal(selectPatientPageRequest);

  private readonly plans = signal<readonly CoveragePlanOption[]>([]);

  private readonly baseColumns: readonly TableColumn[] = [
    { field: 'paciente',      header: 'Paciente' },
    { field: 'dni',           header: 'DNI' },
    { field: 'birthDate',     header: 'Fecha nac.' },
    { field: 'obraSocial',    header: 'Obra social' },
    { field: 'telefono',      header: 'Teléfono' },
    { field: 'estado',        header: 'Estado' },
    { field: 'accesoPortal',  header: 'Acceso al portal' },
  ];

  get columns(): readonly TableColumn[] {
    return this.portalActive()
      ? this.baseColumns
      : this.baseColumns.filter(c => c.field !== 'accesoPortal');
  }

  readonly toggleAction: readonly TableAction[] = [
    { key: 'toggle', icon: 'pi-times-circle', label: 'Activar/Desactivar' },
  ];

  readonly createAccountAction: TableAction = {
    key: 'create-account',
    icon: 'pi-user-plus',
    label: 'Crear acceso al portal',
    hidden: (row) => {
      const p = row as Patient;
      const tieneEmail = (p.contacts ?? []).some(c => c.contactType === 'EMAIL' && c.active);
      return p.accountStatus !== 'NONE' || !tieneEmail || !!p.managedBy;
    },
  };

  readonly resendAccountAction: TableAction = {
    key: 'resend-access',
    icon: 'pi-envelope',
    label: 'Reenviar credenciales',
    hidden: (row) => (row as Patient).accountStatus !== 'PENDING',
  };

  get portalActions(): TableAction[] {
    if (!this.portalActive()) return [];
    return [this.toggleAction[0], this.createAccountAction, this.resendAccountAction];
  }

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
    const p = ev.row as Patient;
    if (ev.key === 'toggle') this.confirmToggle(p);
    else if (ev.key === 'create-account') this.confirmCreateAccount(p);
    else if (ev.key === 'resend-access') this.confirmResendAccess(p);
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

  private confirmCreateAccount(p: Patient): void {
    this.confirm.confirm({
      header: '¿Crear acceso al portal?',
      message: `${p.lastName}, ${p.firstName} — se enviará un mail de primer acceso.`,
      acceptLabel: 'Crear',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(createPatientPortalAccount({ id: p.id })),
    });
  }

  private confirmResendAccess(p: Patient): void {
    this.confirm.confirm({
      header: '¿Reenviar credenciales?',
      message: `${p.lastName}, ${p.firstName}`,
      acceptLabel: 'Reenviar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(resendPatientPortalAccess({ id: p.id })),
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

  /**
   * Returns the display label for the accesoPortal cell when accountStatus is 'NONE'.
   * Single source of truth — template delegates the managedBy branch to this helper.
   * no managedBy → "Sin cuenta"
   * managedBy count=1 → "Sin cuenta · Gestionado por {titularNombre}"
   * managedBy count>1 → "Sin cuenta · Gestionado por {titularNombre} +{count-1}"
   */
  accesoPortalLabel(p: Patient): string {
    const mb = p.managedBy;
    if (!mb) return 'Sin cuenta';
    const base = `Sin cuenta · Gestionado por ${mb.titularNombre}`;
    return mb.count > 1 ? `${base} +${mb.count - 1}` : base;
  }
}
