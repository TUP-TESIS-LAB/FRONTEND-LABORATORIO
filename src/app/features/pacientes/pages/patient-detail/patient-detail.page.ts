import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
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
  loadPatient, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectSelectedPatient, selectPatientPending,
} from '../../store/patient.selectors';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';

@Component({
  selector: 'pat-patient-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, ButtonModule, TabsModule, TagModule, ConfirmDialogModule,
    DatePipe, DniPipe, AgePipe, EmptyStateComponent, PatientFormDrawerComponent,
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
            <p-tag [value]="p.status" severity="info" class="ml-2" />
            @if (!p.active) { <p-tag value="Inactivo" severity="danger" class="ml-1" /> }
          </h1>
          <div class="flex gap-2">
            <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" (onClick)="drawerOpen.set(true)" />
            <p-button
              severity="danger"
              [outlined]="true"
              [icon]="p.active ? 'pi pi-times-circle' : 'pi pi-refresh'"
              [label]="p.active ? 'Desactivar' : 'Reactivar'"
              (onClick)="confirmToggle()" />
          </div>
        </header>

        <div class="grid grid-cols-4 gap-3 mb-4">
          <div><div class="text-xs text-surface-500">DNI</div><div>{{ p.dni | dni }}</div></div>
          <div><div class="text-xs text-surface-500">Fecha nac.</div><div>{{ p.birthDate | date:'dd/MM/yyyy' }}</div></div>
          <div><div class="text-xs text-surface-500">Edad</div><div>{{ p.birthDate | age }} años</div></div>
          <div><div class="text-xs text-surface-500">Género · Sexo</div><div>{{ p.gender }} · {{ p.sexAtBirth }}</div></div>
        </div>

        <p-tabs value="data">
          <p-tablist>
            <p-tab value="data">Datos generales</p-tab>
            <p-tab value="contacts">Contactos</p-tab>
            <p-tab value="addresses">Direcciones</p-tab>
            <p-tab value="coverages">Coberturas</p-tab>
            <p-tab value="history">Historial</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="data">
              <p>Datos completos visibles arriba. Para editar usá el botón "Editar".</p>
            </p-tabpanel>
            <p-tabpanel value="contacts">
              @if (p.contacts.length === 0) {
                <ui-empty-state heading="Sin contactos" icon="pi-phone" />
              } @else {
                <ul class="space-y-1">
                  @for (c of p.contacts; track c.id ?? c.contactValue) {
                    <li class="flex gap-2 items-center">
                      <p-tag [value]="c.contactType" />
                      <span>{{ c.contactValue }}</span>
                      @if (c.isPrimary) { <p-tag severity="success" value="Primario" /> }
                      @if (!c.active) { <p-tag severity="danger" value="Inactivo" /> }
                    </li>
                  }
                </ul>
              }
            </p-tabpanel>
            <p-tabpanel value="addresses">
              @if (p.addresses.length === 0) {
                <ui-empty-state heading="Sin direcciones" icon="pi-map-marker" />
              } @else {
                <ul class="space-y-1">
                  @for (a of p.addresses; track a.id) {
                    <li>
                      {{ a.street }} {{ a.streetNumber }} {{ a.apartment ? '· ' + a.apartment : '' }} — {{ a.city }} / {{ a.province }}
                      @if (a.isPrimary) { <p-tag severity="success" value="Primario" class="ml-1" /> }
                      @if (!a.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
                    </li>
                  }
                </ul>
              }
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
        <pat-form-drawer [open]="drawerOpen()" [patient]="p" (closed)="drawerOpen.set(false)" />
      </div>
    } @else {
      <div class="p-6">{{ pending() ? 'Cargando…' : 'Paciente no encontrado.' }}</div>
    }
  `,
})
export class PatientDetailPage implements OnInit, OnDestroy {
  /** Comes from the routed param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly drawerOpen = signal(false);

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.store.dispatch(loadPatient({ id: numericId }));
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedPatient()); }

  planLabel(planId: number): string { return getCoveragePlanLabel(planId); }

  confirmToggle(): void {
    const p = this.patient();
    if (!p) return;
    const deleted = p.active;
    this.confirm.confirm({
      header: deleted ? '¿Desactivar paciente?' : '¿Reactivar paciente?',
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }
}
