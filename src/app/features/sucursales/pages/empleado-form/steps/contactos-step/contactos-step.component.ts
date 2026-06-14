import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { EmployeeContactType } from '../../../../models/employee.model';

@Component({
  selector: 'emp-contactos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, Select],
  template: `
    <div class="max-w-3xl flex flex-col gap-3">
      @if (array().length === 0) {
        <p class="text-surface-500 text-sm">Sin contactos. Podés agregar email, teléfono, etc. (opcional).</p>
      }
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="group" class="flex items-end gap-2">
          <label class="flex flex-col gap-1 w-48">
            <span class="text-sm font-medium">Tipo</span>
            <p-select formControlName="contactType" [options]="typeOptions" optionLabel="label" optionValue="value" />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-sm font-medium">Valor</span>
            <input pInputText formControlName="value" autocomplete="off" />
          </label>
          <p-button type="button" [text]="true" severity="danger" icon="pi pi-trash"
                    ariaLabel="Quitar contacto" (onClick)="remove(i)" />
        </div>
      }
      <div>
        <p-button type="button" label="Agregar contacto" [text]="true" (onClick)="add()" />
      </div>
    </div>
  `,
})
export class ContactosStepComponent {
  private readonly fb = inject(FormBuilder);
  readonly array = input.required<FormArray<FormGroup>>();

  readonly typeOptions: { label: string; value: EmployeeContactType }[] = [
    { label: 'Email', value: 'EMAIL' },
    { label: 'Teléfono', value: 'PHONE' },
    { label: 'Celular', value: 'MOBILE' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Fax', value: 'FAX' },
    { label: 'Sitio web', value: 'WEBSITE' },
  ];

  add(): void {
    this.array().push(this.fb.group({
      id: [null as number | null],
      contactType: ['EMAIL' as EmployeeContactType, Validators.required],
      value: ['', Validators.required],
    }));
  }
  remove(i: number): void { this.array().removeAt(i); }
}
