import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AddressFieldsComponent } from '@features/pacientes/components/address-fields/address-fields.component';

/**
 * Paso "Datos generales": identidad + contacto (email/celular, los 2 tipos que se exponen
 * de los 6 del back) + domicilio texto-libre (reusa pat-address-fields, igual a paciente).
 * Secciones visuales sin subtítulos verbosos (estándar de stepper del proyecto).
 */
@Component({
  selector: 'emp-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, ToggleSwitch, AddressFieldsComponent],
  template: `
    <div class="flex flex-col gap-6 max-w-3xl">
      <section [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Email</span>
          <input pInputText type="email" formControlName="email" autocomplete="off" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Celular</span>
          <input pInputText formControlName="mobile" autocomplete="off" />
        </label>
      </section>

      <section class="flex flex-col gap-2">
        <h4 class="text-sm font-semibold m-0">Domicilio</h4>
        <pat-address-fields [group]="addressGroup()" />
      </section>
    </div>
  `,
})
export class DatosStepComponent {
  readonly group = input.required<FormGroup>();
  readonly addressGroup = input.required<FormGroup>();
}
