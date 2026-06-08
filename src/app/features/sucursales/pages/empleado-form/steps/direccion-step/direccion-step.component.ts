import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'emp-direccion-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
      <p class="md:col-span-3 text-sm text-surface-500 -mb-1">Domicilio del empleado (opcional).</p>
      <label class="flex flex-col gap-1 md:col-span-2">
        <span class="text-sm font-medium">Calle</span>
        <input pInputText formControlName="street" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Número</span>
        <input pInputText formControlName="streetNumber" autocomplete="off" />
      </label>
    </div>
  `,
})
export class DireccionStepComponent {
  readonly group = input.required<FormGroup>();
}
