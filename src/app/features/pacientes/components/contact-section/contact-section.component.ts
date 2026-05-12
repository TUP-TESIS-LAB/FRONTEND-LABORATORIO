import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="flex flex-col gap-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="pat-form__row">
          <div class="pat-form__row-header">
            <strong style="font-size:12px">Contacto #{{ i + 1 }}</strong>
            <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small" (onClick)="remove(i)" ariaLabel="Eliminar contacto" />
          </div>
          <div class="pat-form__grid">
            <div class="pat-form__field">
              <label class="pat-form__label">Tipo</label>
              <p-select formControlName="contactType" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Valor</label>
              <input pInputText formControlName="contactValue" class="pat-form__input" placeholder="Ej: 11 5555-1234 o email@dom.com" />
            </div>
          </div>
          <div class="pat-form__row-flags">
            <label class="pat-form__row-flag">
              <p-radioButton name="contact-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
              <span>Primario</span>
            </label>
            <label class="pat-form__row-flag">
              <p-toggleSwitch formControlName="active" />
              <span>Activo</span>
            </label>
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
