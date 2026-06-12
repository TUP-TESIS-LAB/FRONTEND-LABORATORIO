import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { GENDER_OPTS, SEX_OPTS } from '../../../../models/patient-labels';
import { AddressFieldsComponent } from '../../../../components/address-fields/address-fields.component';
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

@Component({
  selector: 'pat-general-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, DatePickerModule, AddressFieldsComponent, DateAutoFormatDirective],
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
        <label class="pat-form__label">Género<span class="pat-form__req">*</span></label>
        <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Sexo registral<span class="pat-form__req">*</span></label>
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

    <!-- Domicilio: ahora vive dentro de Datos generales (5 campos). -->
    <div class="mt-6 border-t pt-4">
      <h3 class="text-sm font-semibold text-surface-700 mb-3"><i class="pi pi-map-marker mr-1"></i>Domicilio <span class="text-xs font-normal text-surface-400">(opcional)</span></h3>
      <pat-address-fields [group]="addressGroup()" />
    </div>
  `,
})
export class GeneralStepComponent {
  readonly group = input.required<FormGroup>();
  /** FormGroup de dirección, ahora renderizado dentro de este paso. */
  readonly addressGroup = input.required<FormGroup>();
  readonly dniDuplicate = input<boolean>(false);
  readonly editMode = input<boolean>(false);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;
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
  }
}
