import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'med-contacto-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Email</span>
        <input pInputText type="email" formControlName="email" autocomplete="off" placeholder="medico@ejemplo.com" />
        @if (group().get('email')?.touched && group().get('email')?.hasError('email')) {
          <span class="text-xs" style="color: var(--ds-danger);">Email inválido.</span>
        }
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Teléfono</span>
        <input pInputText formControlName="phone" autocomplete="off" placeholder="Ej. 11-2222-3333" />
      </label>
      <label class="flex flex-col gap-1 md:col-span-2">
        <span class="text-sm font-medium">Dirección — Calle</span>
        <input pInputText formControlName="street" autocomplete="off" placeholder="Ej. Av. Corrientes" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Número</span>
        <input pInputText formControlName="streetNumber" autocomplete="off" placeholder="Ej. 1234" />
      </label>
    </div>
  `,
})
export class ContactoStepComponent {
  readonly group = input.required<FormGroup>();
}
