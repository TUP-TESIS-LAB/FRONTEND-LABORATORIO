import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  Address, Contact, CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, addPatientSuccess, updatePatient, updatePatientSuccess,
  checkPatientDni, loadPatient, clearSelectedPatient,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState, selectSelectedPatient,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../../components/contact-section/contact-section.component';
import { CoverageSectionComponent } from '../../components/coverage-section/coverage-section.component';
import { FormStepperHeaderComponent } from './components/form-stepper-header/form-stepper-header.component';
import { GeneralStepComponent } from './steps/general-step/general-step.component';
import { AddressStepComponent } from './steps/address-step/address-step.component';
import { CoveragesStepComponent } from './steps/coverages-step/coverages-step.component';
import { SummaryStepComponent, SummaryView } from './steps/summary-step/summary-step.component';
import { PATIENT_FORM_STEPS } from './patient-form-steps';
import { humanizeBackendError } from '@shared/utils/error-messages';

function isoFromDate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function isAddressFilled(a: Partial<Address>): boolean {
  return !!(a.street || a.streetNumber || a.apartment || a.city || a.province
    || a.neighborhood || a.zipCode);
}

@Component({
  selector: 'pat-patient-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, GeneralStepComponent, AddressStepComponent,
    CoveragesStepComponent, SummaryStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
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

      <pat-form-stepper-header
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        <div class="w-full">
          @if (saveError(); as err) {
            <div class="pat-form__card"
                 style="background:#fef2f2;border-color:var(--ds-danger);color:var(--ds-danger);margin-bottom:12px;">
              {{ saveErrorMessage(err) }}
            </div>
          }

          @switch (currentStep()) {
            @case (0) {
              <pat-general-step
                [group]="generalGroup"
                [extraContacts]="contactsArray"
                [dniDuplicate]="dniDuplicate()"
                [editMode]="isEdit()" />
            }
            @case (1) {
              <pat-address-step [group]="addressGroup" />
            }
            @case (2) {
              <pat-coverages-step [array]="coveragesArray" />
            }
            @case (3) {
              <pat-summary-step [data]="summaryView()" (editStep)="goToStep($event)" />
            }
          }
        </div>
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">{{ formStatusLabel() }}</span>
        <span class="text-xs text-surface-400 ml-2">
          Paso {{ currentStep() + 1 }} de {{ steps.length }} ·
          <kbd>Ctrl</kbd>+<kbd>S</kbd> para guardar · <kbd>Esc</kbd> para volver
        </span>
        <!--
          flex-row-reverse: DOM order Registrar → Atrás → Cancelar (acción primaria
          primero en tab order), pero visualmente queda Cancelar | Atrás | Registrar
          como pidió la convención. Así Tab desde el último campo del form aterriza
          directo en el CTA principal y no en Cancelar.
        -->
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (showSubmitButton()) {
            <p-button
              [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
              type="submit"
              severity="success"
              [loading]="pending()"
              [disabled]="!canSubmit()" />
          }
          @if (showContinueButton()) {
            <p-button
              label="Continuar →"
              type="button"
              [disabled]="!canContinue()"
              (onClick)="goNext()" />
          }
          @if (!isFirstStep()) {
            <p-button label="← Atrás" [text]="true" type="button" (onClick)="goBack()" />
          }
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class PatientFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = PATIENT_FORM_STEPS;

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
      mobile: [''],
      email: [''],
    }),
    address: this.fb.group({
      street: [''], streetNumber: [''], apartment: [''], neighborhood: [''],
      city: [''], province: [''], zipCode: [''],
    }),
    contacts: this.fb.array<FormGroup>([]),
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

  readonly step0Valid = computed(() => {
    void this.value(); void this.status();
    const g = this.form.get('general');
    return !!g && g.valid && !this.dniDuplicate();
  });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.step0Valid();
    return true;
  });

  // Submit habilitado solo cuando el boton Registrar/Guardar esta visible:
  // en edicion en cualquier paso, en alta unicamente en el paso Resumen.
  // Asi Ctrl+S desde paso 0/1/2 en alta no dispara onSubmit en silencio.
  readonly canSubmit = computed(() =>
    this.step0Valid() && !this.pending() && (this.isEdit() || this.isLastStep())
  );

  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<SummaryView>(() => {
    void this.value();
    const raw = this.form.getRawValue() as {
      general: {
        firstName: string; lastName: string; dni: string;
        birthDate: Date | string | null;
        gender: Gender | null; sexAtBirth: SexAtBirth | null;
        mobile: string; email: string;
      };
      address: Partial<Address>;
      contacts: { contactType: 'PHONE' | 'EMAIL'; contactValue: string }[];
      coverages: { planId: number | null; memberNumber: string; isPrimary: boolean }[];
    };
    return {
      firstName: raw.general.firstName,
      lastName: raw.general.lastName,
      dni: raw.general.dni,
      birthDate: raw.general.birthDate,
      gender: raw.general.gender,
      sexAtBirth: raw.general.sexAtBirth,
      mobile: raw.general.mobile,
      email: raw.general.email,
      extraContacts: raw.contacts
        .filter((c) => !!c.contactValue)
        .map((c) => ({ contactType: c.contactType, contactValue: c.contactValue })),
      address: raw.address,
      coverages: raw.coverages.filter((c) => c.planId != null),
    };
  });

  get generalGroup(): FormGroup { return this.form.get('general') as FormGroup; }
  get addressGroup(): FormGroup { return this.form.get('address') as FormGroup; }
  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
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
        this.visited.set(new Set([0, 1, 2, 3]));
      }
    });

    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      if (this.isEdit()) return;
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      if (/^\d{7,}$/.test(clean)) this.store.dispatch(checkPatientDni({ dni: clean }));
    });

    this.actions$
      .pipe(ofType(addPatientSuccess, updatePatientSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/pacientes']));
  }

  goNext(): void {
    if (!this.canContinue()) {
      this.form.get('general')?.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
    this.ensureStepDefaults(next);
  }

  goBack(): void {
    const prev = Math.max(this.currentStep() - 1, 0);
    this.currentStep.set(prev);
  }

  goToStep(i: number): void {
    if (!this.visited().has(i)) return;
    this.currentStep.set(i);
    this.ensureStepDefaults(i);
  }

  private ensureStepDefaults(stepIndex: number): void {
    // Step 2 = Coberturas (paso opcional). Seed 1 fila vacia primaria SIN
    // Validators.required: el paso es opcional, no debe forzar form-INVALID.
    // El submit filtra las filas con planId nulo o memberNumber vacio para
    // no postear coberturas a medias.
    if (stepIndex === 2 && this.coveragesArray.length === 0) {
      this.coveragesArray.push(this.fb.group({
        id: [null],
        planId: [null],
        memberNumber: [''],
        isPrimary: [true],
        active: [true],
      }));
    }
  }

  private resetForCreate(): void {
    this.form.reset({
      general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null, mobile: '', email: '' },
      address: { street: '', streetNumber: '', apartment: '', neighborhood: '', city: '', province: '', zipCode: '' },
    });
    this.contactsArray.clear();
    this.coveragesArray.clear();
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
  }

  private hydrate(p: Patient): void {
    // Backend solo conoce PHONE / EMAIL — para los inputs "Celular" y "Email"
    // del general-step se elige el activo + primario; si no hay, fallback al
    // primer activo; si no, al primero sin filtro (consistente con como
    // patient-list lee el contacto principal del paciente).
    const findPrimary = (type: 'PHONE' | 'EMAIL') => {
      const sameType = p.contacts.filter((c) => c.contactType === type);
      return sameType.find((c) => c.active && c.isPrimary)
          ?? sameType.find((c) => c.active)
          ?? sameType[0];
    };
    const primaryMobile = findPrimary('PHONE');
    const primaryEmail  = findPrimary('EMAIL');
    const extras = p.contacts.filter((c) => c !== primaryMobile && c !== primaryEmail);
    const primaryAddress = p.addresses[0];

    this.form.patchValue({
      general: {
        firstName: p.firstName, lastName: p.lastName, dni: p.dni,
        birthDate: p.birthDate ? new Date(p.birthDate) : null,
        gender: p.gender, sexAtBirth: p.sexAtBirth,
        mobile: primaryMobile?.contactValue ?? '',
        email: primaryEmail?.contactValue ?? '',
      },
      address: {
        street: primaryAddress?.street ?? '',
        streetNumber: primaryAddress?.streetNumber ?? '',
        apartment: primaryAddress?.apartment ?? '',
        neighborhood: primaryAddress?.neighborhood ?? '',
        city: primaryAddress?.city ?? '',
        province: primaryAddress?.province ?? '',
        zipCode: primaryAddress?.zipCode ?? '',
      },
    });
    this.contactsArray.clear();
    extras.forEach((c) => this.contactsArray.push(ContactSectionComponent.toFormGroup(this.fb, c)));
    this.coveragesArray.clear();
    p.coverages.forEach((c) => this.coveragesArray.push(CoverageSectionComponent.toFormGroup(this.fb, c)));
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    // Pasa por humanizeBackendError para no leakear FQCN / texto en inglés (regla #4).
    return humanizeBackendError(err, {
      fallback: 'No se pudo guardar el paciente.',
      byStatus: {
        409: 'Ya existe un paciente con ese DNI.',
        400: 'Algunos datos del paciente no son válidos. Revisalos e intentá de nuevo.',
        422: 'Algunos datos del paciente no son válidos. Revisalos e intentá de nuevo.',
        500: 'No se pudo guardar el paciente. Intentá de nuevo en unos minutos.',
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      this.onSubmit();
      return;
    }
    if (e.key === 'Escape') {
      const overlayOpen = document.querySelector('.p-overlay-mask, .p-datepicker-panel, .p-select-overlay');
      if (overlayOpen) return;
      e.preventDefault();
      this.onBack();
    }
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const raw = this.form.getRawValue() as {
      general: {
        firstName: string; lastName: string; dni: string;
        birthDate: Date | string | null;
        gender: Gender | null; sexAtBirth: SexAtBirth | null;
        mobile: string; email: string;
      };
      address: Partial<Address>;
      contacts: Contact[];
      coverages: { id?: number; planId: number; memberNumber: string; isPrimary: boolean; active: boolean }[];
    };

    const contacts: Contact[] = [];
    if (raw.general.mobile?.trim()) {
      // Backend (analitica.domain.ContactType) sólo conoce PHONE / EMAIL.
      // El campo "mobile" del general-step se mapea a PHONE en el modelo persistido.
      // Si en el futuro se agrega MOBILE al enum del back, cambiar acá y en contact-section.
      contacts.push({ contactType: 'PHONE', contactValue: raw.general.mobile.trim(), isPrimary: true, active: true });
    }
    if (raw.general.email?.trim()) {
      contacts.push({
        contactType: 'EMAIL', contactValue: raw.general.email.trim(),
        isPrimary: !contacts.length, active: true,
      });
    }
    contacts.push(...raw.contacts.filter((c) => !!c.contactValue));

    const addresses: Address[] = isAddressFilled(raw.address)
      ? [{
          street: raw.address.street ?? '', streetNumber: raw.address.streetNumber ?? '',
          apartment: raw.address.apartment ?? '', neighborhood: raw.address.neighborhood ?? '',
          city: raw.address.city ?? '', province: raw.address.province ?? '',
          zipCode: raw.address.zipCode ?? '', isPrimary: true, active: true,
        }]
      : [];

    // Filtrar coberturas incompletas — el seed automatico al entrar al paso
    // crea una fila vacia con planId/memberNumber requeridos; si el usuario
    // no la toca, la dejamos afuera del payload para que el alta con datos
    // minimos funcione (paso es opcional).
    const coverages = raw.coverages.filter(
      (c) => c.planId != null && !!c.memberNumber?.trim()
    );

    const common = {
      firstName: raw.general.firstName, lastName: raw.general.lastName,
      birthDate: isoFromDate(raw.general.birthDate),
      gender: raw.general.gender, sexAtBirth: raw.general.sexAtBirth,
      contacts, addresses, coverages,
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
    if (!this.form.dirty) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/pacientes']),
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedPatient());
  }
}
