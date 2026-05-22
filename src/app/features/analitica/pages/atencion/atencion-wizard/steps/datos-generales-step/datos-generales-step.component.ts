import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Patient } from '@features/pacientes/models/patient.model';
import { PatientSearchComponent } from '../../../../../components/patient-search/patient-search.component';
import { assignGeneralData } from '../../../../../store/atencion/atencion.actions';
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

  readonly atencionId = input.required<number>();

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
    writeAtencionSession({ atencionId: this.atencionId(), uiStep: 'datos' });
    writePendingDni(dni);
    this.router.navigate(['/pacientes/form'], {
      queryParams: { dni, returnTo: `/analitica/atencion/${this.atencionId()}` },
    });
  }

  canContinue(): boolean {
    return this.patient() != null;
  }

  onContinue(): void {
    const p = this.patient();
    if (!p) return;
    this.store.dispatch(assignGeneralData({
      id: this.atencionId(),
      payload: {
        patientId: p.id,
        doctorId: null,
        insurancePlanId: null,
        indications: this.form.indications || null,
      },
    }));
  }
}
