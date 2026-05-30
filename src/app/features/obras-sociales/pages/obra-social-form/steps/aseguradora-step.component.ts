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
    <div [formGroup]="group()" class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Código *</label>
        <input pInputText formControlName="code" maxlength="20" placeholder="Ej. OSDE" />
        @if (showError('code')) { <small class="text-red-600">El código es obligatorio (máx. 20).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Sigla *</label>
        <input pInputText formControlName="acronym" maxlength="10" placeholder="Ej. OSDE" />
        @if (showError('acronym')) { <small class="text-red-600">La sigla es obligatoria (máx. 10).</small> }
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">Nombre *</label>
        <input pInputText formControlName="name" maxlength="100" placeholder="Nombre de la obra social" />
        @if (showError('name')) { <small class="text-red-600">El nombre es obligatorio (3 a 100 caracteres).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Tipo *</label>
        <p-select formControlName="insurerType" [options]="typeOptions" optionLabel="label" optionValue="value" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">CUIT *</label>
        <input pInputText formControlName="cuit" placeholder="30-12345678-9" />
        @if (showError('cuit')) { <small class="text-red-600">Ingresá un CUIT válido (formato 30-12345678-9).</small> }
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">URL de autorización</label>
        <input pInputText formControlName="authorizationUrl" maxlength="255" placeholder="https://…" />
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">Descripción</label>
        <textarea pTextarea formControlName="description" rows="2" maxlength="255"></textarea>
      </div>

      <div class="col-span-2 mt-2 text-xs text-surface-500">Contacto (opcional)</div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Teléfono</label>
        <input pInputText formControlName="phone" placeholder="0810-…" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Email</label>
        <input pInputText formControlName="email" placeholder="contacto@…" />
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
