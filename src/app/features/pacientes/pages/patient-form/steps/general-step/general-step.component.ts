import { ChangeDetectionStrategy, Component, computed, effect, input, signal, viewChild } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { Gender, SexAtBirth } from '../../../../models/patient.model';
import { ContactSectionComponent } from '../../../../components/contact-section/contact-section.component';
import { DateAutoFormatDirective } from '@shared/directives/date-auto-format.directive';

/** Medianoche de hoy (local). Para comparar contra la fecha elegida sin la parte horaria. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Valida que la fecha de nacimiento no sea futura. Acepta `Date` (p-datepicker)
 * o string ISO (hydrate). Vacio se considera valido (lo cubre Validators.required).
 * Marca el error `futureDate` que el general-step muestra inline en español.
 */
export const notFutureDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw == null || raw === '') return null;
  const value = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(value.getTime())) return null;
  const picked = new Date(value);
  picked.setHours(0, 0, 0, 0);
  return picked.getTime() > startOfToday().getTime() ? { futureDate: true } : null;
};

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

@Component({
  selector: 'pat-general-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, DatePickerModule, ButtonModule, ContactSectionComponent, DateAutoFormatDirective],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" [formGroup]="group()">
      <div class="pat-form__field">
        <label class="pat-form__label">Apellido<span class="pat-form__req">*</span></label>
        <input pInputText formControlName="lastName" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Nombre<span class="pat-form__req">*</span></label>
        <input pInputText formControlName="firstName" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">DNI<span class="pat-form__req">*</span></label>
        <input pInputText formControlName="dni" class="pat-form__input" />
        @if (dniDuplicate()) {
          <p class="pat-form__error" role="alert">Ya existe un paciente con ese DNI</p>
        }
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Fecha de nacimiento<span class="pat-form__req">*</span></label>
        <p-datepicker formControlName="birthDate"
                      dateFormat="dd/mm/yy"
                      appendTo="body"
                      [showIcon]="true"
                      [maxDate]="today()"
                      appDateAutoFormat />
        @if (birthDateFuture()) {
          <p class="pat-form__error" role="alert">La fecha de nacimiento no puede ser futura.</p>
        }
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Género</label>
        <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Sexo registral</label>
        <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label"><i class="pi pi-phone mr-1"></i>Celular</label>
        <input pInputText formControlName="mobile" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label"><i class="pi pi-envelope mr-1"></i>Email</label>
        <input pInputText formControlName="email" type="email" class="pat-form__input" />
      </div>
    </div>

    <div class="mt-6 border-t pt-4">
      <div class="flex items-center justify-between gap-2">
        <button type="button"
                class="flex items-center gap-2 text-sm font-medium text-surface-700 hover:text-primary-600"
                [attr.aria-expanded]="extrasOpen()"
                aria-controls="pat-extras-panel"
                (click)="extrasOpen.set(!extrasOpen())">
          <i class="pi" aria-hidden="true"
             [class.pi-chevron-right]="!extrasOpen()"
             [class.pi-chevron-down]="extrasOpen()"></i>
          Otros contactos
          <span class="text-xs text-surface-500 font-normal">(teléfonos fijos, contactos adicionales)</span>
          @if (extraContacts().length > 0) {
            <span class="ml-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{{ extraContacts().length }}</span>
          }
        </button>
        @if (extrasOpen()) {
          <p-button icon="pi pi-plus" label="Agregar contacto" severity="secondary" [text]="true" size="small"
                    (onClick)="contactSection()?.add()" />
        }
      </div>
      @if (extrasOpen()) {
        <div id="pat-extras-panel" class="mt-3" role="region" aria-label="Otros contactos">
          <pat-contact-section [array]="extraContacts()" />
        </div>
      }
    </div>
  `,
})
export class GeneralStepComponent {
  readonly group = input.required<FormGroup>();
  readonly extraContacts = input.required<FormArray<FormGroup>>();
  readonly dniDuplicate = input<boolean>(false);
  readonly editMode = input<boolean>(false);
  readonly contactSection = viewChild(ContactSectionComponent);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;
  readonly extrasOpen = signal(false);
  /** Tope del datepicker: hoy (no se puede elegir una fecha futura). */
  readonly today = signal(startOfToday());

  // Re-evalua el error inline cuando cambia el form (el control no es signal).
  private readonly groupStatus = signal(0);
  readonly birthDateFuture = computed(() => {
    this.groupStatus();
    const ctrl = this.group().get('birthDate');
    return !!ctrl && ctrl.hasError('futureDate');
  });

  constructor() {
    // Asegura que el control de fecha de nacimiento valide "no futura" aunque el
    // form padre no lo haya cableado, y refresca el flag de error inline.
    effect((onCleanup) => {
      const ctrl = this.group().get('birthDate');
      if (!ctrl) return;
      if (!ctrl.hasValidator(notFutureDateValidator)) {
        ctrl.addValidators(notFutureDateValidator);
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
      this.groupStatus.update((n) => n + 1);
      const sub = ctrl.statusChanges.subscribe(() => this.groupStatus.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      const dniCtrl = this.group().get('dni');
      if (!dniCtrl) return;
      if (this.editMode()) dniCtrl.disable({ emitEvent: false });
      else dniCtrl.enable({ emitEvent: false });
    });

    // El FormArray no cambia de referencia cuando se hace push/clear, asi que
    // un effect que solo lee .length no se entera. Nos suscribimos a sus
    // valueChanges para abrir el acordeon cuando aparecen extras (incluido el
    // caso de edicion: el shell hydrate-empuja extras despues de mount y
    // sin esto el panel quedaba colapsado).
    effect((onCleanup) => {
      const arr = this.extraContacts();
      if (arr.length > 0) this.extrasOpen.set(true);
      const sub = arr.valueChanges.subscribe(() => {
        if (arr.length > 0) this.extrasOpen.set(true);
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
