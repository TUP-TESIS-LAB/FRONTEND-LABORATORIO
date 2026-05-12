import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, updatePatient, checkPatientDni,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../contact-section/contact-section.component';
import { AddressSectionComponent } from '../address-section/address-section.component';
import { CoverageSectionComponent } from '../coverage-section/coverage-section.component';

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
  selector: 'pat-form-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule,
    AccordionModule, TagModule, DatePickerModule,
    ContactSectionComponent, AddressSectionComponent, CoverageSectionComponent,
  ],
  template: `
    <p-drawer
      [visible]="open()"
      (visibleChange)="onVisibleChange($event)"
      position="left"
      [modal]="true"
      [dismissible]="true"
      styleClass="ui-drawer-half"
      [header]="isEdit() ? 'Editar paciente' : 'Nuevo paciente'">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="flex-1 overflow-y-auto pr-2">
          @if (saveError(); as err) {
            <div class="mb-3 p-2 rounded text-sm" style="background:#fee2e2;border:1px solid var(--ds-danger);color:var(--ds-danger);">
              {{ saveErrorMessage(err) }}
            </div>
          }
          <p-accordion [multiple]="true" [value]="['general','contacts']">
            <p-accordion-panel value="general">
              <p-accordion-header>
                Datos generales
                <p-tag [value]="statusEstimate()" severity="info" class="ml-2" />
              </p-accordion-header>
              <p-accordion-content>
                <div class="grid grid-cols-2 gap-3" formGroupName="general">
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Apellido*</label>
                    <input pInputText formControlName="lastName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Nombre*</label>
                    <input pInputText formControlName="firstName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">DNI*</label>
                    <input pInputText formControlName="dni" class="w-full" />
                    @if (dniDuplicate()) {
                      <p class="text-xs mt-1" style="color:var(--ds-danger)" role="alert">
                        Ya existe un paciente con ese DNI
                      </p>
                    }
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Fecha de nacimiento*</label>
                    <p-datepicker formControlName="birthDate" dateFormat="dd/mm/yy" appendTo="body" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Género</label>
                    <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" placeholder="—" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Sexo registral</label>
                    <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" placeholder="—" class="w-full" />
                  </div>
                </div>
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="contacts">
              <p-accordion-header>Contactos</p-accordion-header>
              <p-accordion-content>
                <pat-contact-section [array]="contactsArray" />
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="addresses">
              <p-accordion-header>Direcciones</p-accordion-header>
              <p-accordion-content>
                <pat-address-section [array]="addressesArray" />
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="coverages">
              <p-accordion-header>Coberturas</p-accordion-header>
              <p-accordion-content>
                <pat-coverage-section [array]="coveragesArray" />
              </p-accordion-content>
            </p-accordion-panel>
          </p-accordion>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-surface-200">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="onCancel()" />
          <p-button
            [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
            type="submit"
            [disabled]="!canSubmit()" />
        </div>
      </form>
    </p-drawer>
  `,
})
export class PatientFormDrawerComponent {
  readonly open = input.required<boolean>();
  readonly patient = input<Patient | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly saveError = this.store.selectSignal(selectPatientError);
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

  // Form state mirrored as signals (per angular-conventions)
  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => this.patient() != null);
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

  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addressesArray(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coveragesArray(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  constructor() {
    // Hydrate / reset based on inputs
    effect(() => {
      const p = this.patient();
      const opened = this.open();
      if (!opened) return;
      if (p) {
        this.hydrate(p);
        this.form.get('general.dni')?.disable({ emitEvent: false });
      } else {
        this.resetForCreate();
        this.form.get('general.dni')?.enable({ emitEvent: false });
      }
    });

    // Dispatch DNI check on user typing in create mode
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
    const current = this.patient();
    if (current) {
      const req: UpdatePatientRequest = common;
      this.store.dispatch(updatePatient({ id: current.id, req }));
    } else {
      const req: CreatePatientRequest = { ...common, dni: raw.general.dni };
      this.store.dispatch(addPatient({ req }));
    }
  }

  onCancel(): void { this.closed.emit(); }
  onVisibleChange(v: boolean): void { if (!v) this.closed.emit(); }
}
