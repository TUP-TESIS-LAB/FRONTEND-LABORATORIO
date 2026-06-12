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
import { getCoveragePlanLabel, CoveragePlanOption } from '../../models/coverage-plans.catalog';
import { CoveragePlansService } from '../../services/coverage-plans.service';
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
              @if (p.coverages.length === 0) {
                <ui-empty-state heading="Sin coberturas" icon="pi-id-card" />
              } @else {
                <ul class="space-y-1">
                  @for (c of p.coverages; track c.id) {
                    <li>
                      {{ planLabel(c.planId) }} — N° {{ c.memberNumber }}
                      @if (c.isPrimary) { <p-tag severity="success" value="Primario" class="ml-1" /> }
                      @if (!c.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
                    </li>
                  }
                </ul>
              }
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
  private readonly plansService = inject(CoveragePlansService);
  readonly canMutate = this.perms.canMutate;

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly pending = this.store.selectSignal(selectPatientPending);

  private readonly plans = signal<readonly CoveragePlanOption[]>([]);

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.store.dispatch(loadPatient({ id: numericId }));
    this.plansService.getActivePlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => { /* lista queda vacía; no se expone el error al usuario */ },
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedPatient()); }

  planLabel(planId: number): string { return getCoveragePlanLabel(planId, this.plans()); }

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
