import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { NotificationService } from '@core/services/notification.service';
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectSelectedPatient, selectPatientPending,
} from '../../store/patient.selectors';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { CoverageCatalog, EMPTY_CATALOG, insurerNameForPlan, planName } from '../../models/coverage-catalog.model';
import { CoverageCatalogService } from '../../services/coverage-catalog.service';
import { PatientHistoryService } from '../../services/patient-history.service';
import { PatientHistoryItem, deliveryStatusLabel, deliveryStatusSeverity } from '../../models/patient-history.model';
import { genderLabel, sexLabel, statusLabel } from '../../models/patient-labels';
import { Address, ContactType, Patient } from '../../models/patient.model';

@Component({
  selector: 'pat-patient-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, DatePipe],
  imports: [
    RouterLink, ButtonModule, TabsModule, TagModule, ConfirmDialogModule, TooltipModule,
    DatePipe, DniPipe, AgePipe, CurrencyArPipe, EmptyStateComponent,
    DataTableComponent, UiCellDirective, UiRowExpansionDirective, PageHeaderComponent,
  ],
  template: `
    @if (patient(); as p) {
      <div>
        <a routerLink="/pacientes" class="inline-block mb-3">
          <p-button [text]="true" label="Volver a Pacientes" />
        </a>
        <ui-page-header [heading]="p.lastName + ', ' + p.firstName">
          <p-tag [value]="statusLabel(p.status)" severity="info" />
          @if (!p.active) { <p-tag value="Inactivo" severity="danger" /> }
          @if (canMutate()) {
            <a [routerLink]="['/pacientes', p.id, 'editar']" [queryParams]="{ returnTo: '/pacientes/' + p.id }">
              <p-button severity="secondary" [outlined]="true" label="Editar" />
            </a>
            <p-button
              severity="danger"
              [outlined]="true"
              [label]="p.active ? 'Desactivar' : 'Reactivar'"
              (onClick)="confirmToggle()" />
          }
        </ui-page-header>

        <p-tabs value="data">
          <p-tablist>
            <p-tab value="data">Datos generales</p-tab>
            <p-tab value="coverages">Obras sociales</p-tab>
            <p-tab value="history">Historial</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="data">
              <!-- Identidad + contacto + domicilio (antes vivían en la row superior y en tabs aparte). -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <div><div class="text-xs text-surface-500">DNI</div><div>{{ p.dni | dni }}</div></div>
                <div><div class="text-xs text-surface-500">Fecha nac.</div><div>{{ p.birthDate ? (p.birthDate | date:'dd/MM/yyyy') : '—' }}</div></div>
                <div><div class="text-xs text-surface-500">Edad</div><div>{{ p.birthDate ? (p.birthDate | age) + ' años' : '—' }}</div></div>
                <div><div class="text-xs text-surface-500">Género</div><div>{{ genderLabel(p.gender) }}</div></div>
                <div><div class="text-xs text-surface-500">Sexo registral</div><div>{{ sexLabel(p.sexAtBirth) }}</div></div>
                <div><div class="text-xs text-surface-500">Celular</div><div>{{ primaryContact(p, 'PHONE') || '—' }}</div></div>
                <div><div class="text-xs text-surface-500">Email</div><div>{{ primaryContact(p, 'EMAIL') || '—' }}</div></div>
              </div>
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-2">Domicilio</div>
                @if (primaryAddress(p); as a) {
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                    <div><div class="text-xs text-surface-500">Calle</div><div>{{ a.street || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Número</div><div>{{ a.streetNumber || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Piso/Depto</div><div>{{ a.apartment || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Barrio</div><div>{{ a.neighborhood || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Ciudad</div><div>{{ a.city || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Provincia</div><div>{{ a.province || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Código postal</div><div>{{ a.zipCode || '—' }}</div></div>
                  </div>
                } @else {
                  <div class="cv-muted">Sin domicilio cargado</div>
                }
              </div>
            </p-tabpanel>
            <p-tabpanel value="coverages">
              <!-- Read-only: mismo estilo que el Paso 2 del stepper. Para editar, usar "Editar". -->
              <div class="cv-table">
                <table>
                  <thead>
                    <tr>
                      <th>Obra social</th><th>Plan</th><th>N° afiliado</th>
                      <th class="cv-center">Principal</th><th class="cv-center">Activa</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Particular</td><td class="cv-muted">—</td><td class="cv-muted">—</td>
                      <td class="cv-center">@if (!hasPrimaryCoverage(p)) { <i class="pi pi-check text-green-600"></i> }</td>
                      <td class="cv-center cv-muted">—</td>
                    </tr>
                    @for (c of p.coverages; track c.id) {
                      <tr>
                        <td>{{ insurerNameForPlan(catalog(), c.planId) }}</td>
                        <td>{{ planName(catalog(), c.planId) }}</td>
                        <td>{{ c.memberNumber || '—' }}</td>
                        <td class="cv-center">@if (c.isPrimary) { <i class="pi pi-check text-green-600"></i> }</td>
                        <td class="cv-center">@if (c.active) { <i class="pi pi-check text-green-600"></i> } @else { <span class="cv-muted">—</span> }</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </p-tabpanel>
            <p-tabpanel value="history">
              @if (history().length === 0) {
                <ui-empty-state
                  heading="Sin atenciones"
                  icon="pi-history"
                  hint="Cuando el paciente tenga atenciones registradas, aparecerán acá." />
              } @else {
                <ui-table
                  [value]="history()"
                  [columns]="historyColumns"
                  [expandable]="true"
                  dataKey="attentionId">

                  <ng-template uiCell="fecha" let-row>
                    {{ row.createdAt ? (row.createdAt | date:'dd/MM/yy HH:mm') : '—' }}
                  </ng-template>
                  <ng-template uiCell="analisis" let-row>{{ row.analysisCount }}</ng-template>
                  <ng-template uiCell="importe" let-row>
                    {{ row.total != null ? (row.total | currencyAr) : '—' }}
                  </ng-template>
                  <ng-template uiCell="cobertura" let-row>{{ coverageLabel(row.insurancePlanId) }}</ng-template>

                  <ng-template uiRowExpansion let-row>
                    <div class="flex flex-wrap gap-x-6 gap-y-1 mb-2">
                      <div class="text-xs font-medium text-surface-700">
                        Protocolo {{ row.protocolId ? ('P-' + row.protocolId) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        Copago: {{ row.copaymentAmount != null ? (row.copaymentAmount | currencyAr) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        N° autorización: {{ row.authorizationNumber ?? '—' }}
                      </div>
                    </div>
                    @if (row.reportAvailable) {
                      <div class="mb-2 flex items-center gap-2">
                        <p-button
                          size="small"
                          icon="pi pi-print"
                          label="Imprimir estudio"
                          [outlined]="true"
                          (onClick)="printReport(row)" />
                        @if (row.lastPrintedBy) {
                          <span class="text-xs text-surface-500"
                                [pTooltip]="'Impreso el ' + (row.lastPrintedAt | date:'dd/MM/yy HH:mm') + ' por ' + row.lastPrintedBy">
                            <i class="pi pi-check-circle text-green-600"></i> Impreso
                          </span>
                        }
                      </div>
                    }
                    <table class="hist-detail">
                      <thead>
                        <tr><th>Análisis</th><th class="cv-center">Importe cobrado</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        @for (a of row.analyses; track a.analysisId) {
                          <tr>
                            <td>{{ a.analysisName ?? ('#' + a.analysisId) }}</td>
                            <td class="cv-center">{{ a.chargedPrice != null ? (a.chargedPrice | currencyAr) : '—' }}</td>
                            <td>
                              <p-tag [severity]="deliverySeverity(a.deliveryStatus)" [value]="deliveryLabel(a.deliveryStatus)" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </ng-template>
                </ui-table>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

        <p-confirmDialog />
      </div>
    } @else {
      <div class="p-6">{{ pending() ? 'Cargando…' : 'Paciente no encontrado.' }}</div>
    }
  `,
  styles: [`
    .cv-table { border: 1px solid #e8edf3; border-radius: 10px; overflow: hidden; }
    .cv-table table { width: 100%; border-collapse: collapse; }
    .cv-table thead th {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 9px 14px; color: #475569; font-weight: 700; background: #f4f7fb;
      text-align: left; white-space: nowrap;
    }
    .cv-table tbody td { font-size: 13px; padding: 7px 14px; border: none; }
    .cv-table tbody tr:nth-child(even) { background: #fafbfd; }
    .cv-center { text-align: center; }
    .cv-muted { color: #94a3b8; }

    /* Tabla de detalle (análisis) dentro de la fila expandida del historial. */
    .hist-detail { width: 100%; border-collapse: collapse; }
    .hist-detail thead th {
      font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;
      color: #64748b; font-weight: 700; text-align: left; padding: 4px 10px;
    }
    .hist-detail tbody td { font-size: 13px; padding: 5px 10px; }
    .hist-detail .cv-center { text-align: center; }
  `],
})
export class PatientDetailPage implements OnInit, OnDestroy {
  /** Comes from the routed param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  constructor() {
    this.actions$
      .pipe(ofType(loadPatientFailure), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/pacientes']));
  }

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly actions$ = inject(Actions);
  private readonly perms = inject(PatientPermissionsService);
  private readonly catalogService = inject(CoverageCatalogService);
  private readonly historyService = inject(PatientHistoryService);
  private readonly notifications = inject(NotificationService);
  private readonly datePipe = inject(DatePipe);
  readonly canMutate = this.perms.canMutate;

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly pending = this.store.selectSignal(selectPatientPending);

  readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);
  // Helpers de catálogo expuestos al template (read-only de coberturas).
  readonly insurerNameForPlan = insurerNameForPlan;
  readonly planName = planName;

  // ── Historial de atenciones ──
  readonly history = signal<PatientHistoryItem[]>([]);
  readonly historyColumns: readonly TableColumn[] = [
    { field: 'attentionNumber', header: 'N° atención' },
    { field: 'fecha',           header: 'Fecha' },
    { field: 'analisis',        header: 'Análisis', align: 'center' },
    { field: 'importe',         header: 'Importe', align: 'right' },
    { field: 'cobertura',       header: 'Cobertura' },
  ];
  readonly deliveryLabel = deliveryStatusLabel;
  readonly deliverySeverity = deliveryStatusSeverity;

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.store.dispatch(loadPatient({ id: numericId }));
    this.catalogService.getCatalog().subscribe({
      next: (cat) => this.catalog.set(cat),
      error: () => { /* catálogo vacío; no se expone el error al usuario */ },
    });
    this.loadHistory(numericId);
  }

  private loadHistory(patientId: number): void {
    this.historyService.getHistory(patientId).subscribe({
      next: (items) => this.history.set(items),
      error: () => { /* historial vacío; no se expone el error al usuario */ },
    });
  }

  /** Etiqueta de cobertura para una atención: Particular si no hay plan, si no la obra social. */
  coverageLabel(insurancePlanId: number | null): string {
    if (insurancePlanId == null) return 'Particular';
    return insurerNameForPlan(this.catalog(), insurancePlanId);
  }

  printReport(row: PatientHistoryItem): void {
    if (row.protocolId == null) return;
    const patientId = this.patient()?.id;
    if (patientId == null) return;
    if (row.lastPrintedBy) {
      const formattedDate = this.datePipe.transform(row.lastPrintedAt, 'dd/MM/yy HH:mm');
      this.confirm.confirm({
        header: 'Reimprimir estudio',
        message: `Ya se imprimió el ${formattedDate} por ${row.lastPrintedBy}. ¿Reimprimir igual?`,
        acceptLabel: 'Reimprimir',
        rejectLabel: 'Cancelar',
        accept: () => this.downloadAndOpenReport(patientId, row.protocolId!),
      });
    } else {
      this.downloadAndOpenReport(patientId, row.protocolId);
    }
  }

  private downloadAndOpenReport(patientId: number, protocolId: number): void {
    this.historyService.printReport(patientId, protocolId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.loadHistory(patientId);
      },
      error: () => this.notifications.error('No se pudo imprimir el estudio. Intentá de nuevo en unos minutos.'),
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedPatient()); }

  /** True si alguna cobertura real es principal (si no, Particular es la principal). */
  hasPrimaryCoverage(p: Patient): boolean {
    return p.coverages.some((c) => c.isPrimary && c.active);
  }

  // Labels en español (única fuente: patient-labels) expuestos al template.
  readonly statusLabel = statusLabel;
  readonly genderLabel = genderLabel;
  readonly sexLabel = sexLabel;

  /** Valor del contacto principal de un tipo: activo+primario → activo → primero. */
  primaryContact(p: Patient, type: ContactType): string {
    const same = p.contacts.filter((c) => c.contactType === type);
    const chosen = same.find((c) => c.active && c.isPrimary) ?? same.find((c) => c.active) ?? same[0];
    return chosen?.contactValue ?? '';
  }

  /** Dirección a mostrar: activa+primaria → activa → primera cargada. */
  primaryAddress(p: Patient): Address | undefined {
    return p.addresses.find((a) => a.active && a.isPrimary) ?? p.addresses.find((a) => a.active) ?? p.addresses[0];
  }

  confirmToggle(): void {
    const p = this.patient();
    if (!p) return;
    const deleted = p.active;
    this.confirm.confirm({
      header: deleted ? '¿Desactivar paciente?' : '¿Reactivar paciente?',
      message: `${p.lastName}, ${p.firstName}`,
      acceptLabel: deleted ? 'Desactivar' : 'Reactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }
}
