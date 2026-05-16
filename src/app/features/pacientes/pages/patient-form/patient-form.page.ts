import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, updatePatient, checkPatientDni, loadPatient, clearSelectedPatient,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState, selectSelectedPatient,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../../components/contact-section/contact-section.component';
import { AddressSectionComponent } from '../../components/address-section/address-section.component';
import { CoverageSectionComponent } from '../../components/coverage-section/coverage-section.component';

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'NOT_SPECIFIED', label: 'No especificado' },
];
const SEX_OPTS: { value: SexAtBirth; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'INTERSEX', label: 'Intersex' },
];

function isoFromDate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

@Component({
  selector: 'pat-patient-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule,
    TagModule, DatePickerModule,
    ContactSectionComponent, AddressSectionComponent, CoverageSectionComponent,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver"
                  type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar paciente' : 'Nuevo paciente' }}
          @if (isEdit() && patient(); as p) {
            <span class="text-surface-500 font-normal ml-2">· {{ p.lastName }}, {{ p.firstName }}</span>
          }
        </h1>
        <nav class="ml-auto text-xs text-surface-500">
          Pacientes › {{ isEdit() ? 'Editar' : 'Nuevo' }}
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          @if (saveError(); as err) {
            <div class="lg:col-span-2 pat-form__card"
                 style="background:#fef2f2;border-color:var(--ds-danger);color:var(--ds-danger);">
              {{ saveErrorMessage(err) }}
            </div>
          }

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-user" style="margin-right:6px"></i>Datos generales</span>
              <p-tag [value]="statusEstimate()" severity="info" />
            </div>
            <div class="pat-form__grid" formGroupName="general">
              <div class="pat-form__field">
                <label class="pat-form__label">Apellido*</label>
                <input pInputText formControlName="lastName" class="pat-form__input" placeholder="García" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="firstName" class="pat-form__input" placeholder="María Elena" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">DNI*</label>
                <input pInputText formControlName="dni" class="pat-form__input" placeholder="32456789" />
                @if (dniDuplicate()) {
                  <p class="pat-form__error" role="alert">Ya existe un paciente con ese DNI</p>
                }
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Fecha de nacimiento*</label>
                <p-datepicker formControlName="birthDate" dateFormat="dd/mm/yy" appendTo="body" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Género</label>
                <p-select formControlName="gender" [options]="genderOpts" optionLabel="label"
                          optionValue="value" placeholder="—" appendTo="body" class="w-full" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Sexo registral</label>
                <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label"
                          optionValue="value" placeholder="—" appendTo="body" class="w-full" />
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-id-card" style="margin-right:6px"></i>Coberturas</span>
            </div>
            <pat-coverage-section [array]="coveragesArray" />
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-phone" style="margin-right:6px"></i>Contactos</span>
            </div>
            <pat-contact-section [array]="contactsArray" />
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-map-marker" style="margin-right:6px"></i>Direcciones</span>
            </div>
            <pat-address-section [array]="addressesArray" />
          </section>
        </div>
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">
          {{ formStatusLabel() }}
        </span>
        <span class="text-xs text-surface-400 ml-2">
          <kbd>Ctrl</kbd>+<kbd>S</kbd> para guardar · <kbd>Esc</kbd> para volver
        </span>
        <div class="ml-auto flex gap-2">
          <p-button label="Cancelar" severity="secondary" [outlined]="true"
                    type="button" (onClick)="onBack()" />
          <p-button
            [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
            type="submit"
            [loading]="pending()"
            [disabled]="!canSubmit()" />
        </div>
      </footer>
    </form>
  `,
})
export class PatientFormPage {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly saveError = this.store.selectSignal(selectPatientError);
  readonly patient = this.store.selectSignal(selectSelectedPatient);
  private readonly state = this.store.selectSignal(selectPatientState);

  readonly form: FormGroup = this.fb.group({
    general: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
      birthDate: [null, Validators.required],
      gender: [null],
      sexAtBirth: [null],
    }),
    contacts: this.fb.array<FormGroup>([]),
    addresses: this.fb.array<FormGroup>([]),
    coverages: this.fb.array<FormGroup>([]),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => {
    const v = this.id();
    return v != null && v !== '';
  });
  readonly invalid = computed(() => this.status() === 'INVALID');

  readonly dniDuplicate = computed(() => {
    if (this.isEdit()) return false;
    const dni = (this.value() as { general?: { dni?: string } } | undefined)?.general?.dni ?? '';
    const clean = dni.toString().replace(/\D/g, '');
    const check = this.state().dniCheck;
    if (!check) return false;
    return check.dni === clean && check.exists === true;
  });

  readonly canSubmit = computed(() => !this.invalid() && !this.dniDuplicate() && !this.pending());

  readonly statusEstimate = computed<'MIN' | 'COMPLETE'>(() => {
    const v = this.value() as {
      general: { firstName?: string; lastName?: string; dni?: string; birthDate?: unknown; gender?: string | null; sexAtBirth?: string | null };
      contacts: { active?: boolean }[];
      coverages: { active?: boolean }[];
    };
    const hasContact = v.contacts.some((c) => c.active);
    const hasCoverage = v.coverages.some((c) => c.active);
    const ok = !!v.general.firstName && !!v.general.lastName && !!v.general.dni
      && !!v.general.birthDate && !!v.general.gender && !!v.general.sexAtBirth
      && hasContact && hasCoverage;
    return ok ? 'COMPLETE' : 'MIN';
  });

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    if (this.form.dirty) return '● Cambios sin guardar';
    return 'Sin cambios';
  });

  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addressesArray(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coveragesArray(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.hydratedForId !== undefined) {
          this.resetForCreate();
          this.hydratedForId = undefined;
        }
        return;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        this.router.navigate(['/pacientes']);
        return;
      }
      if (this.hydratedForId !== id) {
        this.store.dispatch(loadPatient({ id: numericId }));
        this.hydratedForId = id;
      }
    });

    effect(() => {
      const p = this.patient();
      if (this.isEdit() && p && String(p.id) === this.id()) {
        this.hydrate(p);
        this.form.get('general.dni')?.disable({ emitEvent: false });
      }
    });

    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      if (this.isEdit()) return;
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      if (/^\d{7,}$/.test(clean)) this.store.dispatch(checkPatientDni({ dni: clean }));
    });
  }

  private resetForCreate(): void {
    this.form.reset({ general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null } });
    this.contactsArray.clear();
    this.addressesArray.clear();
    this.coveragesArray.clear();
    this.form.get('general.dni')?.enable({ emitEvent: false });
  }

  private hydrate(p: Patient): void {
    this.form.patchValue({
      general: {
        firstName: p.firstName, lastName: p.lastName, dni: p.dni,
        birthDate: p.birthDate ? new Date(p.birthDate) : null,
        gender: p.gender, sexAtBirth: p.sexAtBirth,
      },
    });
    this.contactsArray.clear();
    p.contacts.forEach((c) => this.contactsArray.push(ContactSectionComponent.toFormGroup(this.fb, c)));
    this.addressesArray.clear();
    p.addresses.forEach((a) => this.addressesArray.push(AddressSectionComponent.toFormGroup(this.fb, a)));
    this.coveragesArray.clear();
    p.coverages.forEach((c) => this.coveragesArray.push(CoverageSectionComponent.toFormGroup(this.fb, c)));
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    if (err.status === 409) return 'Ya existe un paciente con ese DNI.';
    return err.error?.message ?? 'No se pudo guardar el paciente.';
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const raw = this.form.getRawValue() as {
      general: { firstName: string; lastName: string; dni: string; birthDate: Date | string | null; gender: Gender | null; sexAtBirth: SexAtBirth | null };
      contacts: never[]; addresses: never[]; coverages: never[];
    };
    const common = {
      firstName: raw.general.firstName, lastName: raw.general.lastName,
      birthDate: isoFromDate(raw.general.birthDate),
      gender: raw.general.gender, sexAtBirth: raw.general.sexAtBirth,
      contacts: raw.contacts, addresses: raw.addresses, coverages: raw.coverages,
    };
    const editId = this.id();
    if (editId) {
      const req: UpdatePatientRequest = common;
      this.store.dispatch(updatePatient({ id: Number(editId), req }));
    } else {
      const req: CreatePatientRequest = { ...common, dni: raw.general.dni };
      this.store.dispatch(addPatient({ req }));
    }
  }

  onBack(): void {
    this.router.navigate(['/pacientes']);
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedPatient());
  }
}
