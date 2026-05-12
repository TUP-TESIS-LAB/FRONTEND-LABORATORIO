import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Address } from '../../models/patient.model';

@Component({
  selector: 'pat-address-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="grid grid-cols-12 gap-2 border border-surface-200 rounded p-2">
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Calle</label><input pInputText formControlName="street" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Número</label><input pInputText formControlName="streetNumber" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Depto</label><input pInputText formControlName="apartment" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">CP</label><input pInputText formControlName="zipCode" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Barrio</label><input pInputText formControlName="neighborhood" class="w-full"></div>
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Ciudad</label><input pInputText formControlName="city" class="w-full"></div>
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Provincia</label><input pInputText formControlName="province" class="w-full"></div>
          <div class="col-span-2 text-center">
            <label class="block text-xs text-surface-500 mb-1">Primario</label>
            <p-radioButton name="address-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Activo</label>
            <p-toggleSwitch formControlName="active" />
          </div>
          <div class="col-span-1 text-right">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="remove(i)" ariaLabel="Eliminar dirección" />
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar dirección" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class AddressSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null], city: [''], province: [''], street: [''], streetNumber: [''],
      apartment: [''], neighborhood: [''], zipCode: [''],
      isPrimary: [isPrimary], active: [true],
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

  static toFormGroup(fb: FormBuilder, a: Address): FormGroup {
    return fb.group({
      id: [a.id ?? null],
      city: [a.city ?? ''], province: [a.province ?? ''], street: [a.street ?? ''],
      streetNumber: [a.streetNumber ?? ''], apartment: [a.apartment ?? ''],
      neighborhood: [a.neighborhood ?? ''], zipCode: [a.zipCode ?? ''],
      isPrimary: [a.isPrimary], active: [a.active],
    });
  }
}
