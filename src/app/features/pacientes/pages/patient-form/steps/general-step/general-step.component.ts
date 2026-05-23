import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Gender, SexAtBirth } from '../../../../models/patient.model';

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
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, DatePickerModule],
  template: `
    <div class="pat-form__grid" [formGroup]="group()">
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
        <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Sexo registral</label>
        <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
    </div>
  `,
})
export class GeneralStepComponent {
  readonly group = input.required<FormGroup>();
  readonly dniDuplicate = input<boolean>(false);
  readonly editMode = input<boolean>(false);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  constructor() {
    effect(() => {
      const dniCtrl = this.group().get('dni');
      if (!dniCtrl) return;
      if (this.editMode()) dniCtrl.disable({ emitEvent: false });
      else dniCtrl.enable({ emitEvent: false });
    });
  }
}
