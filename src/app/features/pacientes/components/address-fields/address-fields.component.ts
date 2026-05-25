import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'pat-address-fields',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" [formGroup]="group()">
      <div class="pat-form__field">
        <label class="pat-form__label">Calle</label>
        <input pInputText formControlName="street" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Número</label>
        <input pInputText formControlName="streetNumber" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Depto</label>
        <input pInputText formControlName="apartment" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Código postal</label>
        <input pInputText formControlName="zipCode" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Barrio</label>
        <input pInputText formControlName="neighborhood" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Ciudad</label>
        <input pInputText formControlName="city" class="pat-form__input" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Provincia</label>
        <input pInputText formControlName="province" class="pat-form__input" />
      </div>
    </div>
  `,
})
export class AddressFieldsComponent {
  readonly group = input.required<FormGroup>();
}
