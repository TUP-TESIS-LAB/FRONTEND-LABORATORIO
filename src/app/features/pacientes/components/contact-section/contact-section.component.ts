import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Contact, ContactType } from '../../models/patient.model';

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'PHONE', label: 'Teléfono fijo' },
  { value: 'MOBILE', label: 'Celular' },
  { value: 'EMAIL', label: 'Email' },
];

@Component({
  selector: 'pat-contact-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="grid grid-cols-12 gap-2 items-end border border-surface-200 rounded p-2">
          <div class="col-span-3">
            <label class="block text-xs text-surface-500 mb-1">Tipo</label>
            <p-select formControlName="contactType" [options]="typeOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="col-span-5">
            <label class="block text-xs text-surface-500 mb-1">Valor</label>
            <input pInputText formControlName="contactValue" class="w-full" />
          </div>
          <div class="col-span-2 text-center">
            <label class="block text-xs text-surface-500 mb-1">Primario</label>
            <p-radioButton name="contact-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Activo</label>
            <p-toggleSwitch formControlName="active" />
          </div>
          <div class="col-span-1 text-right">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="remove(i)" ariaLabel="Eliminar contacto" />
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar contacto" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class ContactSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  readonly typeOptions = TYPE_OPTIONS;

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null],
      contactValue: ['', Validators.required],
      contactType: ['PHONE' as ContactType, Validators.required],
      isPrimary: [isPrimary],
      active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) this.array().at(0).patchValue({ isPrimary: true });
  }

  setPrimary(index: number): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: i === index }));
  }

  static toFormGroup(fb: FormBuilder, c: Contact): FormGroup {
    return fb.group({
      id: [c.id ?? null],
      contactValue: [c.contactValue, Validators.required],
      contactType: [c.contactType, Validators.required],
      isPrimary: [c.isPrimary],
      active: [c.active],
    });
  }
}
