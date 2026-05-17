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
    <div class="flex flex-col gap-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="pat-form__row">
          <div class="pat-form__row-header">
            <strong style="font-size:12px">Dirección #{{ i + 1 }}</strong>
            <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small" (onClick)="remove(i)" ariaLabel="Eliminar dirección" />
          </div>
          <div class="pat-form__grid">
            <div class="pat-form__field">
              <label class="pat-form__label">Calle</label>
              <input pInputText formControlName="street" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Número</label>
              <input pInputText formControlName="streetNumber" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Depto</label>
              <input pInputText formControlName="apartment" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Código postal</label>
              <input pInputText formControlName="zipCode" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Barrio</label>
              <input pInputText formControlName="neighborhood" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Ciudad</label>
              <input pInputText formControlName="city" class="pat-form__input">
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Provincia</label>
              <input pInputText formControlName="province" class="pat-form__input">
            </div>
          </div>
          <div class="pat-form__row-flags">
            <label class="pat-form__row-flag">
              <p-radioButton name="address-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
              <span>Primario</span>
            </label>
            <label class="pat-form__row-flag">
              <p-toggleSwitch formControlName="active" />
              <span>Activa</span>
            </label>
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
