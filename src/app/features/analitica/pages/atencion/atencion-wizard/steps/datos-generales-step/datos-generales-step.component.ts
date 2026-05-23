import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Patient } from '@features/pacientes/models/patient.model';
import { PatientSearchComponent } from '../../../../../components/patient-search/patient-search.component';
import { assignGeneralData, createBlankAtencion } from '../../../../../store/atencion/atencion.actions';
import {
  clearPendingDni,
  readPendingDni,
  writeAtencionSession,
  writePendingDni,
} from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-datos-generales-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, PatientSearchComponent],
  template: `
    <div class="space-y-4">
      <lab-patient-search
        [initialDni]="initialDni()"
        (patientSelected)="onPatientSelected($event)"
        (notFound)="onPatientNotFound($event)" />

      <div>
        <label class="block text-sm">Indicaciones</label>
        <input pInputText [(ngModel)]="form.indications" class="w-full" />
      </div>

      <div class="flex justify-end">
        <p-button label="Continuar →" [disabled]="!canContinue()" (onClick)="onContinue()" />
      </div>
    </div>
  `,
})
export class DatosGeneralesStepComponent {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);

  /**
   * Atención id. Null = modo "crear nueva atención" (en `/analitica/atencion/nueva`):
   * cuando el usuario clickea Continuar disparamos createBlankAtencion en lugar de
   * assignGeneralData. El effect del store ya navega a `/analitica/atencion/{newId}`
   * tras el success, así que el wizard re-monta con la atención recién creada.
   */
  readonly atencionId = input<number | null>(null);

  readonly patient = signal<Patient | null>(null);
  form = { indications: '' };

  initialDni(): string | null {
    const pending = readPendingDni();
    if (pending) clearPendingDni();
    return pending;
  }

  onPatientSelected(p: Patient): void {
    this.patient.set(p);
  }

  onPatientNotFound(dni: string): void {
    const id = this.atencionId();
    // Si estamos creando una nueva atención (id null), returnTo apunta a `/nueva`
    // para que el wizard arranque en modo crear de nuevo tras dar de alta el paciente.
    const returnTo = id != null
      ? `/analitica/atencion/${id}`
      : '/analitica/atencion/nueva';
    writeAtencionSession({ atencionId: id ?? -1, uiStep: 'datos' });
    writePendingDni(dni);
    this.router.navigate(['/pacientes/nuevo'], {
      queryParams: { dni, returnTo },
    });
  }

  canContinue(): boolean {
    return this.patient() != null;
  }

  onContinue(): void {
    const p = this.patient();
    if (!p) return;
    const id = this.atencionId();
    if (id == null) {
      // Modo "crear nueva atención" — disparamos createBlank. El effect del store
      // ya hace navigate a `/analitica/atencion/{newId}` al recibir success.
      // TODO: leer branchId del usuario logueado cuando exista session-bound branch.
      this.store.dispatch(createBlankAtencion({
        payload: {
          branchId: 1,
          patientId: p.id,
          attentionNumber: `A-${Date.now().toString().slice(-6)}`,
          deskAttentionBox: null,
        },
      }));
      return;
    }
    this.store.dispatch(assignGeneralData({
      id,
      payload: {
        patientId: p.id,
        doctorId: null,
        insurancePlanId: null,
        indications: this.form.indications || null,
      },
    }));
  }
}
