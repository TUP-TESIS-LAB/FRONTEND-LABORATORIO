import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PatientSearchAutocompleteComponent } from '@features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component';
import { CreatePatientRequest, Gender, Patient, SexAtBirth } from '@features/pacientes/models/patient.model';
import { SEX_OPTS } from '@features/pacientes/models/patient-labels';

const GENEROS: Array<{ label: string; value: Gender }> = [
  { label: 'Masculino', value: 'MALE' },
  { label: 'Femenino', value: 'FEMALE' },
  { label: 'Otro', value: 'OTHER' },
  { label: 'Sin especificar', value: 'NOT_SPECIFIED' },
];

/** Paso 1: la secretaria busca un paciente existente o lo da de alta rápido. */
@Component({
  selector: 'sacar-step-paciente',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    PatientSearchAutocompleteComponent,
  ],
  template: `
    @if (selectedPatient(); as p) {
      <!-- Paciente ya seleccionado -->
      <label class="text-sm font-medium text-surface-600 block mb-1">Paciente</label>
      <div class="h-10 rounded-xl border border-primary bg-primary-50 px-3 flex items-center gap-2">
        <span class="flex-1 min-w-0 truncate text-sm font-medium">
          {{ p.lastName }}, {{ p.firstName }} <span class="text-surface-500 font-normal">· DNI {{ p.dni }}</span>
        </span>
        <p-button label="Cambiar" severity="secondary" [text]="true" size="small"
                  (onClick)="clearSelection.emit()" />
      </div>
    } @else if (!showAlta) {
      <!-- Búsqueda: label + input, sin encabezados redundantes (paso ya se llama "Datos generales"). -->
      <label class="text-sm font-medium text-surface-600 block mb-1">Paciente</label>
      <div class="sacar-pac-search">
        <pat-search-autocomplete (selected)="patientSelected.emit($event)" />
      </div>
      <button type="button" class="text-primary text-xs font-medium mt-1 hover:underline" (click)="showAlta = true">
        ¿No está registrado? Darlo de alta
      </button>
    } @else {
      <div>
        <!-- Alta rápida -->
        <form class="rounded-xl border border-surface-200 p-4" [formGroup]="form" (ngSubmit)="submitAlta()">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium">Alta rápida de paciente</h3>
            <p-button label="Cancelar" severity="secondary" [text]="true" size="small"
                      (onClick)="showAlta = false" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-dni">DNI *</label>
              <input pInputText id="alta-dni" formControlName="dni" inputmode="numeric" placeholder="Sin puntos" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-nombre">Nombre *</label>
              <input pInputText id="alta-nombre" formControlName="firstName" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-apellido">Apellido *</label>
              <input pInputText id="alta-apellido" formControlName="lastName" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-fnac">Fecha de nacimiento</label>
              <p-datepicker inputId="alta-fnac" formControlName="birthDate" dateFormat="dd/mm/yy"
                            [maxDate]="hoy" [showIcon]="true" appendTo="body" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-genero">Género</label>
              <p-select inputId="alta-genero" formControlName="gender" [options]="generos"
                        optionLabel="label" optionValue="value" placeholder="Elegí…" appendTo="body" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm" for="alta-sexo">Sexo al nacer</label>
              <p-select inputId="alta-sexo" formControlName="sexAtBirth" [options]="sexos"
                        optionLabel="label" optionValue="value" placeholder="Elegí…" appendTo="body" />
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <p-button type="submit" label="Dar de alta y usar"
                      [loading]="creating()" [disabled]="form.invalid" />
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    /* El autocomplete (componente compartido) ocupa todo el ancho de su columna. */
    .sacar-pac-search ::ng-deep .p-autocomplete { width: 100%; display: block; }
    .sacar-pac-search ::ng-deep .p-autocomplete-input { width: 100%; }
  `],
})
export class StepPacienteComponent {
  private readonly fb = inject(FormBuilder);

  readonly selectedPatient = input<Patient | null>(null);
  readonly creating = input(false);

  readonly patientSelected = output<Patient>();
  readonly clearSelection = output<void>();
  readonly createPatient = output<CreatePatientRequest>();

  protected showAlta = false;
  protected readonly generos = GENEROS;
  protected readonly sexos = SEX_OPTS;
  protected readonly hoy = new Date();

  protected readonly form = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthDate: [null as Date | null],
    gender: [null as Gender | null],
    sexAtBirth: [null as SexAtBirth | null],
  });

  submitAlta(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const request: CreatePatientRequest = {
      dni: v.dni!.trim(),
      firstName: v.firstName!.trim(),
      lastName: v.lastName!.trim(),
      birthDate: v.birthDate ? toIsoDate(v.birthDate) : null,
      gender: v.gender ?? null,
      sexAtBirth: v.sexAtBirth ?? null,
      contacts: [],
      addresses: [],
      coverages: [],
    };
    this.createPatient.emit(request);
  }
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
