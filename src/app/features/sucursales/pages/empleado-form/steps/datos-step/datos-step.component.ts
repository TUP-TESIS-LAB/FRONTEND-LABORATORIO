import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';

@Component({
  selector: 'emp-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, ToggleSwitch],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Nombre <span class="pat-form__req">*</span></span>
        <input pInputText formControlName="firstName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Apellido <span class="pat-form__req">*</span></span>
        <input pInputText formControlName="lastName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Documento <span class="pat-form__req">*</span></span>
        <input pInputText formControlName="document" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Matrícula</span>
        <input pInputText formControlName="registration" autocomplete="off" />
      </label>
      <label class="flex items-center gap-2 md:col-span-2">
        <p-toggleswitch formControlName="isBiochemist" />
        <span class="text-sm font-medium">Es bioquímico (puede firmar resultados)</span>
      </label>
    </div>
  `,
})
export class DatosStepComponent {
  readonly group = input.required<FormGroup>();
}
