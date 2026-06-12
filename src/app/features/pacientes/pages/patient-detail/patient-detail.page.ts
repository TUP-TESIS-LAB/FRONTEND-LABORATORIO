import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectSelectedPatient, selectPatientPending,
} from '../../store/patient.selectors';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { CoverageCatalog, EMPTY_CATALOG, insurerNameForPlan, planName } from '../../models/coverage-catalog.model';
import { CoverageCatalogService } from '../../services/coverage-catalog.service';
import { genderLabel, sexLabel, statusLabel } from '../../models/patient-labels';
import { ContactType, Patient } from '../../models/patient.model';

@Component({
  selector: 'pat-patient-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, ButtonModule, TabsModule, TagModule, ConfirmDialogModule,
    DatePipe, DniPipe, AgePipe, EmptyStateComponent,
  ],
  template: `
    @if (patient(); as p) {
      <div class="p-6">
        <a routerLink="/pacientes" class="inline-block mb-3">
          <p-button [text]="true" icon="pi pi-arrow-left" label="Volver a Pacientes" />
        </a>
        <header class="flex items-center justify-between mb-3">
          <h1 class="text-2xl font-semibold">
            {{ p.lastName }}, {{ p.firstName }}
            <p-tag [value]="statusLabel(p.status)" severity="info" class="ml-2" />
            @if (!p.active) { <p-tag value="Inactivo" severity="danger" class="ml-1" /> }
          </h1>
          @if (canMutate()) {
            <div class="flex gap-2">
              <a [routerLink]="['/pacientes', p.id, 'editar']">
                <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" />
              </a>
              <p-button
                severity="danger"
                [outlined]="true"
                [icon]="p.active ? 'pi pi-times-circle' : 'pi pi-refresh'"
                [label]="p.active ? 'Desactivar' : 'Reactivar'"
                (onClick)="confirmToggle()" />
            </div>
          }
        </header>

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
                <div><div class="text-xs text-surface-500"><i class="pi pi-phone mr-1"></i>Celular</div><div>{{ primaryContact(p, 'PHONE') || '—' }}</div></div>
                <div><div class="text-xs text-surface-500"><i class="pi pi-envelope mr-1"></i>Email</div><div>{{ primaryContact(p, 'EMAIL') || '—' }}</div></div>
              </div>
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-1"><i class="pi pi-map-marker mr-1"></i>Domicilio</div>
                <div>{{ addressLine(p) || 'Sin domicilio cargado' }}</div>
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
              <ui-empty-state
                heading="Historial no disponible"
                icon="pi-history"
                hint="Se habilitará cuando se activen los módulos de turnos y estudios." />
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
  readonly canMutate = this.perms.canMutate;

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly pending = this.store.selectSignal(selectPatientPending);

  readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);
  // Helpers de catálogo expuestos al template (read-only de coberturas).
  readonly insurerNameForPlan = insurerNameForPlan;
  readonly planName = planName;

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

  /** Domicilio del paciente en una línea (primera dirección). */
  addressLine(p: Patient): string {
    const a = p.addresses[0];
    if (!a) return '';
    const head = [a.street, a.streetNumber].filter(Boolean).join(' ');
    const tail = [a.neighborhood, a.city, a.province].filter(Boolean).join(', ');
    return [head, tail].filter(Boolean).join(' · ');
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
