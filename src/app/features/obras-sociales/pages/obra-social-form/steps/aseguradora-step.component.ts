import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'os-aseguradora-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, TextareaModule],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Código *</label>
        <input pInputText formControlName="code" maxlength="20" class="w-full" />
        @if (showError('code')) { <small class="text-red-600">El código es obligatorio (máx. 20).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Sigla *</label>
        <input pInputText formControlName="acronym" maxlength="10" class="w-full" />
        @if (showError('acronym')) { <small class="text-red-600">La sigla es obligatoria (máx. 10).</small> }
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="text-sm font-medium">Nombre *</label>
        <input pInputText formControlName="name" maxlength="100" class="w-full" />
        @if (showError('name')) { <small class="text-red-600">El nombre es obligatorio (3 a 100 caracteres).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Tipo *</label>
        <p-select formControlName="insurerType" [options]="typeOptions" optionLabel="label" optionValue="value" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">CUIT *</label>
        <input pInputText formControlName="cuit" class="w-full" />
        @if (showError('cuit')) { <small class="text-red-600">Ingresá un CUIT válido (formato 30-12345678-9).</small> }
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="text-sm font-medium">URL de autorización</label>
        <input pInputText formControlName="authorizationUrl" maxlength="255" class="w-full" />
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="text-sm font-medium">Descripción</label>
        <textarea pTextarea formControlName="description" rows="2" maxlength="255" class="w-full"></textarea>
      </div>

      <div class="sm:col-span-2 mt-2 text-xs text-surface-500">Contacto (opcional)</div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Teléfono</label>
        <input pInputText formControlName="phone" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Email</label>
        <input pInputText formControlName="email" class="w-full" />
        @if (showError('email')) { <small class="text-red-600">Ingresá un email válido.</small> }
      </div>
    </div>
  `,
})
export class AseguradoraStepComponent {
  readonly group = input.required<FormGroup>();

  readonly typeOptions = [
    { label: 'Obra Social', value: 'SOCIAL' },
    { label: 'Prepaga', value: 'PRIVATE' },
  ];

  showError(controlName: string): boolean {
    const c = this.group().get(controlName);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
