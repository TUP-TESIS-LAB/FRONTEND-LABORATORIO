import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { RegistrationType } from '../../../../models/doctor.model';

@Component({
  selector: 'med-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Nombre *</span>
        <input pInputText formControlName="firstName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Apellido *</span>
        <input pInputText formControlName="lastName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Matrícula *</span>
        <input pInputText formControlName="tuition" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Tipo de registro *</span>
        <p-select formControlName="registrationType" [options]="registrationOptions"
                  optionLabel="label" optionValue="value" placeholder="Seleccioná…" />
      </label>
    </div>
  `,
})
export class DatosStepComponent {
  readonly group = input.required<FormGroup>();
  readonly registrationOptions: { label: string; value: RegistrationType }[] = [
    { label: 'Nacional', value: 'NACIONAL' },
    { label: 'Provincial', value: 'PROVINCIAL' },
  ];
}
