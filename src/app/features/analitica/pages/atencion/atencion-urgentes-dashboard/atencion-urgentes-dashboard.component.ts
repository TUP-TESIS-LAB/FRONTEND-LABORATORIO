import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { EMPTY, catchError } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { PollingHandle, PollingService } from '@core/refresh';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { AttentionResponse } from '../../../models/atencion.model';
import {
  attentionStateLabel,
  attentionStateSeverity,
} from '../../../models/atencion-state-label';
import { loadUrgentPending, resolveAuth, resolveCobro, resolveDatos } from '../../../store/urgent-pending/urgent-pending.actions';
import {
  selectUrgentPending,
  selectUrgentPendingLoading,
  selectUrgentPendingResolving,
} from '../../../store/urgent-pending/urgent-pending.selectors';
import { CoverageCatalog, EMPTY_CATALOG, InsurerOption, PlanOption, plansForInsurer } from '@features/pacientes/models/coverage-catalog.model';
import { CoverageCatalogService } from '@features/pacientes/services/coverage-catalog.service';
import { Doctor } from '@features/medicos/models/doctor.model';
import { DoctorService } from '@features/medicos/services/doctor.service';

@Component({
  selector: 'lab-atencion-urgentes-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TagModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DividerModule,
    DataTableComponent,
    UiCellDirective,
  ],
  template: `
    <div class="py-2">
      <section class="bg-white rounded-lg shadow-sm p-4">
        <ui-table
          [value]="rows()"
          [loading]="loading()"
          [columns]="columns"
          [actions]="rowActions"
          emptyHeading="Sin atenciones urgentes pendientes"
          emptyIcon="pi-inbox"
          (action)="onAction($event)">

          <ng-template uiCell="paciente" let-row>
            <div class="font-medium">{{ $any(row).patientFullName ?? '—' }}</div>
            <div class="text-xs text-[var(--ds-text-muted)]">{{ $any(row).patientDni ?? '—' }}</div>
          </ng-template>

          <ng-template uiCell="fecha" let-row>
            {{ $any(row).createdAt ? ($any(row).createdAt | date: 'dd/MM/yy HH:mm') : '—' }}
          </ng-template>

          <ng-template uiCell="estado" let-row>
            <p-tag
              [value]="stateLabel($any(row).attentionState)"
              [severity]="stateSeverity($any(row).attentionState)" />
          </ng-template>

          <ng-template uiCell="pendientes" let-row>
            <div class="flex flex-wrap gap-1">
              @if ($any(row).cobroPendiente) {
                <p-tag value="Cobro" severity="warn" />
              }
              @if ($any(row).autorizacionPendiente) {
                <p-tag value="Autorización" severity="warn" />
              }
              @if ($any(row).datosAdministrativosIncompletos) {
                <p-tag value="Datos" severity="warn" />
              }
            </div>
          </ng-template>

        </ui-table>
      </section>
    </div>

    <!-- ── Drawer de resolución de pendientes (Task 9) ── -->
    <p-drawer
      [visible]="drawerVisible()"
      position="left"
      [modal]="true"
      [dismissible]="true"
      styleClass="ui-drawer-half"
      (onHide)="closeResolver()">

      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-bolt text-orange-500"></i>
          <span class="font-semibold text-base">Resolver pendientes</span>
        </div>
      </ng-template>

      @if (selectedRow(); as row) {
        <div class="flex flex-col gap-5 p-1">

          <!-- Info del paciente -->
          <div class="rounded border border-surface-200 bg-surface-50 p-3">
            <div class="font-medium">{{ row.patientFullName ?? '—' }}</div>
            <div class="text-xs text-[var(--ds-text-muted)]">DNI: {{ row.patientDni ?? '—' }}</div>
            <div class="mt-1">
              <p-tag
                [value]="stateLabel(row.attentionState)"
                [severity]="stateSeverity(row.attentionState)" />
            </div>
          </div>

          <!-- Sección: Autorización -->
          @if (row.autorizacionPendiente) {
            <div class="rounded border border-orange-200 bg-orange-50 p-4 space-y-3">
              <div class="font-semibold text-sm flex items-center gap-2">
                <i class="pi pi-file-check text-orange-600"></i>
                Número de autorización
              </div>
              <form [formGroup]="authForm" (ngSubmit)="onConfirmAuth()">
                <div>
                  <label class="block text-sm mb-1" for="authorizationNumber">
                    Nº de autorización <span class="text-red-500">*</span>
                  </label>
                  <input
                    pInputText
                    id="authorizationNumber"
                    formControlName="authorizationNumber"
                    class="w-full"
                    inputmode="text"
                    autocomplete="off"
                    placeholder="Ingresá el número de autorización" />
                  @if (authForm.controls['authorizationNumber'].invalid && authForm.controls['authorizationNumber'].touched) {
                    <small class="text-red-600 mt-1 block">El número de autorización es obligatorio.</small>
                  }
                </div>
                <div class="flex justify-end mt-3">
                  <p-button
                    type="submit"
                    label="Confirmar autorización"
                    severity="primary"
                    [loading]="resolving()"
                    [disabled]="authForm.invalid || resolving()" />
                </div>
              </form>
            </div>
          }

          <!-- Sección: Datos administrativos -->
          @if (row.datosAdministrativosIncompletos) {
            <div class="rounded border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div class="font-semibold text-sm flex items-center gap-2">
                <i class="pi pi-id-card text-blue-600"></i>
                Datos administrativos
              </div>

              <!-- Obra social / Plan -->
              <div class="space-y-3">
                <div>
                  <label class="block text-sm mb-1">Obra social</label>
                  <p-select
                    [ngModel]="datosInsurerId()"
                    (ngModelChange)="onDatosInsurerChange($event)"
                    [options]="insurerOptions()"
                    optionLabel="name"
                    optionValue="id"
                    [filter]="true"
                    [showClear]="true"
                    placeholder="— Sin cobertura / seleccioná —"
                    appendTo="body"
                    class="w-full" />
                </div>

                @if (datosInsurerId() !== null) {
                  <div>
                    <label class="block text-sm mb-1">Plan</label>
                    <p-select
                      [ngModel]="datosPlanId()"
                      (ngModelChange)="datosPlanId.set($event)"
                      [options]="datosPlanOptions()"
                      optionLabel="name"
                      optionValue="planId"
                      [disabled]="datosInsurerId() == null"
                      placeholder="— Seleccioná plan —"
                      appendTo="body"
                      class="w-full" />
                  </div>
                }

                <!-- Médico solicitante -->
                <div>
                  <label class="block text-sm mb-1">Médico solicitante</label>
                  <p-select
                    [ngModel]="datosDoctorId()"
                    (ngModelChange)="datosDoctorId.set($event)"
                    [options]="doctorOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [filter]="true"
                    [showClear]="true"
                    placeholder="— Sin médico / seleccioná —"
                    appendTo="body"
                    class="w-full" />
                </div>
              </div>

              <div class="flex justify-end">
                <p-button
                  label="Confirmar datos"
                  severity="primary"
                  [loading]="resolving()"
                  [disabled]="resolving()"
                  (onClick)="onConfirmDatos()" />
              </div>
            </div>
          }

          <!-- Sección: Cobro -->
          @if (row.cobroPendiente) {
            <div class="rounded border border-green-200 bg-green-50 p-4 space-y-3">
              <div class="font-semibold text-sm flex items-center gap-2">
                <i class="pi pi-dollar text-green-600"></i>
                Cobro
              </div>
              <p class="text-sm text-[var(--ds-text-muted)]">
                Marcá el cobro como regularizado una vez que hayas procesado el pago.
              </p>
              <div class="flex justify-end">
                <p-button
                  label="Marcar cobro regularizado"
                  severity="success"
                  [loading]="resolving()"
                  [disabled]="resolving()"
                  (onClick)="onConfirmCobro()" />
              </div>
            </div>
          }

        </div>
      }

    </p-drawer>
  `,
  styles: [`
    :host ::ng-deep .ui-drawer-half {
      width: 50vw;
      min-width: 480px;
      max-width: 720px;
    }
    @media (max-width: 767px) {
      :host ::ng-deep .ui-drawer-half {
        width: 100vw;
        min-width: unset;
        max-width: unset;
      }
    }
  `],
})
export class AtencionUrgentesDashboardComponent implements OnInit, OnDestroy {
  private readonly store    = inject(Store);
  private readonly polling  = inject(PollingService);
  private readonly fb       = inject(FormBuilder);
  private readonly coverageCatalog = inject(CoverageCatalogService);
  private readonly doctorsApi      = inject(DoctorService);

  protected readonly rows      = this.store.selectSignal(selectUrgentPending);
  protected readonly loading   = this.store.selectSignal(selectUrgentPendingLoading);
  protected readonly resolving = this.store.selectSignal(selectUrgentPendingResolving);

  // ── Drawer state ────────────────────────────────────────────────────────────
  readonly drawerVisible  = signal(false);
  readonly selectedRow    = signal<AttentionResponse | null>(null);

  // ── Form: autorización ──────────────────────────────────────────────────────
  readonly authForm = this.fb.group({
    authorizationNumber: ['', Validators.required],
  });

  // ── Datos administrativos: OS / médico ──────────────────────────────────────
  protected readonly catalog       = signal<CoverageCatalog>(EMPTY_CATALOG);
  protected readonly datosInsurerId = signal<number | null>(null);
  protected readonly datosPlanId    = signal<number | null>(null);
  protected readonly datosDoctorId  = signal<number | null>(null);

  protected readonly insurerOptions = computed<InsurerOption[]>(() =>
    [...this.catalog().insurers].sort((a, b) => {
      if (a.insurerType === 'SELF_PAY') return -1;
      if (b.insurerType === 'SELF_PAY') return 1;
      return a.name.localeCompare(b.name);
    }),
  );

  protected readonly datosPlanOptions = computed<PlanOption[]>(() =>
    plansForInsurer(this.catalog(), this.datosInsurerId()),
  );

  protected readonly doctors       = signal<Doctor[]>([]);
  protected readonly doctorOptions = computed(() =>
    this.doctors().map(d => ({ value: d.id, label: `${d.lastName}, ${d.firstName} — Mat. ${d.tuition}` })),
  );

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',   header: 'Paciente' },
    { field: 'fecha',      header: 'Fecha' },
    { field: 'estado',     header: 'Estado' },
    { field: 'pendientes', header: 'Pendientes' },
  ];

  readonly rowActions: readonly TableAction[] = [
    {
      key: 'resolver',
      icon: 'pi-bolt',
      label: 'Resolver',
    },
  ];

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.pollingHandle = this.polling.startPolling({
      key: 'atencion-urgentes-dashboard',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadUrgentPending());
        return EMPTY;
      },
    });

    // Catálogo de obras sociales para la sección datos administrativos.
    this.coverageCatalog.getCatalog().pipe(
      catchError(() => EMPTY),
    ).subscribe(cat => this.catalog.set(cat));

    // Médicos solicitantes para el selector.
    this.doctorsApi.list().pipe(
      catchError(() => EMPTY),
    ).subscribe(list => this.doctors.set(list.filter(d => d.active)));
  }

  ngOnDestroy(): void {
    this.pollingHandle?.stop();
  }

  // ── State label helpers (columna "estado" en español) ───────────────────────
  readonly stateLabel  = attentionStateLabel;
  readonly stateSeverity = attentionStateSeverity;

  // ── Drawer open/close ────────────────────────────────────────────────────────
  openResolver(row: AttentionResponse): void {
    this.selectedRow.set(row);
    this.drawerVisible.set(true);
    this.pollingHandle?.setActive(false);
    // Reset forms for the new row.
    this.authForm.reset();
    this.datosInsurerId.set(null);
    this.datosPlanId.set(null);
    this.datosDoctorId.set(null);
  }

  closeResolver(): void {
    this.drawerVisible.set(false);
    this.selectedRow.set(null);
    this.pollingHandle?.setActive(true);
  }

  // ── Confirm actions ──────────────────────────────────────────────────────────
  onConfirmAuth(): void {
    const row = this.selectedRow();
    if (!row || this.authForm.invalid) return;
    const authorizationNumber = this.authForm.value.authorizationNumber ?? null;
    this.store.dispatch(resolveAuth({ id: row.id, authorizationNumber }));
  }

  onConfirmDatos(): void {
    const row = this.selectedRow();
    if (!row) return;
    const doctorId       = this.datosDoctorId() ?? undefined;
    const insurancePlanId = this.datosPlanId() ?? undefined;
    this.store.dispatch(resolveDatos({ id: row.id, doctorId, insurancePlanId }));
  }

  onConfirmCobro(): void {
    const row = this.selectedRow();
    if (!row) return;
    this.store.dispatch(resolveCobro({ id: row.id }));
  }

  // ── OS cascade ──────────────────────────────────────────────────────────────
  onDatosInsurerChange(insurerId: number | null): void {
    this.datosInsurerId.set(insurerId);
    const plans = plansForInsurer(this.catalog(), insurerId);
    this.datosPlanId.set(plans.length === 1 ? plans[0].planId : null);
  }

  onAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'resolver') {
      this.openResolver(ev.row as AttentionResponse);
    }
  }
}
