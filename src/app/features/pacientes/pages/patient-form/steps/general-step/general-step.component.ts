import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { Gender, SexAtBirth } from '../../../../models/patient.model';
import { ContactSectionComponent } from '../../../../components/contact-section/contact-section.component';
import { DateAutoFormatDirective } from '@shared/directives/date-auto-format.directive';

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
        <p-datepicker formControlName="birthDate"
                      dateFormat="dd/mm/yy"
                      appendTo="body"
                      [showIcon]="true"
                      placeholder="dd/mm/aaaa"
                      appDateAutoFormat />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Género</label>
        <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Sexo registral</label>
        <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label"><i class="pi pi-phone mr-1"></i>Celular</label>
        <input pInputText formControlName="mobile" class="pat-form__input" placeholder="11 5555-1234" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label"><i class="pi pi-envelope mr-1"></i>Email</label>
        <input pInputText formControlName="email" type="email" class="pat-form__input" placeholder="maria@dominio.com" />
      </div>
    </div>

    <div class="mt-6 border-t pt-4">
      <button type="button"
              class="flex items-center gap-2 text-sm font-medium text-surface-700 hover:text-primary-600"
              (click)="extrasOpen.set(!extrasOpen())">
        <i class="pi" [class.pi-chevron-right]="!extrasOpen()" [class.pi-chevron-down]="extrasOpen()"></i>
        Otros contactos
        <span class="text-xs text-surface-500 font-normal">(teléfonos fijos, contactos adicionales)</span>
        @if (extraContacts().length > 0) {
          <span class="ml-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{{ extraContacts().length }}</span>
        }
      </button>
      @if (extrasOpen()) {
        <div class="mt-3">
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

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;
  readonly extrasOpen = signal(false);

  constructor() {
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
