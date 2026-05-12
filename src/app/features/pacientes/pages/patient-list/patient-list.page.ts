import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, debounceTime } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { Patient, PatientStatus } from '../../models/patient.model';
import { PatientStateFilter } from '../../models/patient-page.model';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import {
  loadPatients, setPatientPageRequest, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectAllPatients, selectPatientPending, selectPatientPageRequest, selectPatientTotalElements,
} from '../../store/patient.selectors';
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';

@Component({
  selector: 'pat-patient-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, TableModule, ButtonModule, InputTextModule, TagModule, TooltipModule,
    ConfirmDialogModule, SkeletonModule, DatePipe, DniPipe, AgePipe,
    EmptyStateComponent, PatientFormDrawerComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Core clínico</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-address-book"></i> Pacientes</h1>
        </div>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          <p-button label="Nuevo paciente" icon="pi pi-plus" (onClick)="openCreate()" />
        </div>
      </header>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText placeholder="Buscar por nombre o DNI…" (input)="onSearch($any($event.target).value)" />
        </span>
        @for (opt of stateOptions; track opt.value) {
          <p-button
            [label]="opt.label"
            size="small"
            [severity]="pageRequest().state === opt.value ? 'primary' : 'secondary'"
            [outlined]="pageRequest().state !== opt.value"
            (onClick)="setState(opt.value)" />
        }
        <p-button
          label="Sólo completos"
          icon="pi pi-filter"
          size="small"
          [severity]="pageRequest().status === 'COMPLETE' ? 'primary' : 'secondary'"
          [outlined]="pageRequest().status !== 'COMPLETE'"
          (onClick)="toggleCompleteFilter()" />
      </div>

      @if (pending() && items().length === 0) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="3rem" />
          }
        </div>
      } @else {
        <p-table
          [value]="items()"
          [lazy]="true"
          [paginator]="true"
          [rows]="pageRequest().size"
          [totalRecords]="total()"
          [first]="pageRequest().page * pageRequest().size"
          [loading]="pending()"
          (onLazyLoad)="onPage($event)"
          dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Paciente</th><th>DNI</th><th>Fecha nac.</th><th>Obra social</th>
              <th>Teléfono</th><th>Estado</th><th class="text-right" style="width:180px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td>
                <div class="font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
                <div class="text-xs text-surface-500">{{ p.gender }} · {{ p.birthDate | age }} años</div>
              </td>
              <td>{{ p.dni | dni }}</td>
              <td>{{ p.birthDate | date:'dd/MM/yyyy' }}</td>
              <td>{{ primaryCoverageLabel(p) }}</td>
              <td>{{ primaryPhone(p) }}</td>
              <td>
                <p-tag [severity]="statusSeverity(p.status)" [value]="p.status" />
                @if (!p.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
              </td>
              <td class="text-right">
                <a [routerLink]="['/pacientes', p.id]">
                  <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
                </a>
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" (onClick)="openEdit(p)" />
                <p-button [text]="true" icon="pi pi-times-circle" pTooltip="Activar/Desactivar" ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(p)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">
                <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" (ctaClick)="openCreate()" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }

      <p-confirmDialog />
      <pat-form-drawer [open]="drawerOpen()" [patient]="editing()" (closed)="onDrawerClosed()" />
    </div>
  `,
})
export class PatientListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly search$ = new Subject<string>();

  readonly items = this.store.selectSignal(selectAllPatients);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly total = this.store.selectSignal(selectPatientTotalElements);
  readonly pageRequest = this.store.selectSignal(selectPatientPageRequest);

  readonly drawerOpen = signal(false);
  readonly editing = signal<Patient | null>(null);

  readonly stateOptions: { value: PatientStateFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
  ];

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) =>
      this.store.dispatch(setPatientPageRequest({ patch: { q, page: 0 } })),
    );
    this.store.dispatch(loadPatients({ req: this.pageRequest() }));
  }

  onSearch(q: string): void { this.search$.next(q); }
  setState(state: PatientStateFilter): void {
    this.store.dispatch(setPatientPageRequest({ patch: { state, page: 0 } }));
  }
  toggleCompleteFilter(): void {
    const next: PatientStatus | undefined = this.pageRequest().status === 'COMPLETE' ? undefined : 'COMPLETE';
    this.store.dispatch(setPatientPageRequest({ patch: { status: next, page: 0 } }));
  }
  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setPatientPageRequest({ patch: { page, size: rows } }));
  }

  openCreate(): void { this.editing.set(null); this.drawerOpen.set(true); }
  openEdit(p: Patient): void { this.editing.set(p); this.drawerOpen.set(true); }
  onDrawerClosed(): void { this.drawerOpen.set(false); this.editing.set(null); }

  confirmToggle(p: Patient): void {
    const deleted = p.active;
    const verb = deleted ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} paciente?`,
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }

  statusSeverity(status: PatientStatus): 'info' | 'success' | 'warn' {
    return status === 'COMPLETE' ? 'success' : status === 'VERIFIED' ? 'info' : 'warn';
  }

  primaryCoverageLabel(p: Patient): string {
    const c = p.coverages.find((x) => x.isPrimary && x.active) ?? p.coverages.find((x) => x.active);
    return c ? getCoveragePlanLabel(c.planId) : 'Particular';
  }

  primaryPhone(p: Patient): string {
    const c = p.contacts.find((x) => (x.contactType === 'PHONE' || x.contactType === 'MOBILE') && x.active);
    return c?.contactValue ?? '—';
  }
}
